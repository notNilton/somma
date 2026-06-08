package jobs

import (
	"log"
	"time"
)

func (s *Scheduler) checkBudgetAlerts() {
	now := time.Now().UTC()
	today := now.Format("2006-01-02")

	rows, err := s.db.Query(s.ctx, `
		SELECT b.id, b.user_id, b.name,
		       COALESCE(b.allocated_amount_cents, 0) AS total_cents,
		       COALESCE(s.spent_cents, 0) AS spent_cents
		FROM budgets b
		LEFT JOIN (
			SELECT budget_id,
			       SUM(CASE WHEN type = 'EXPENSE' THEN amount_cents ELSE 0 END) AS spent_cents
			FROM transactions
			WHERE is_active = true
			  AND status = 'COMPLETED'
			  AND budget_id IS NOT NULL
			GROUP BY budget_id
		) s ON s.budget_id = b.id
		WHERE b.is_active = true
		  AND COALESCE(b.allocated_amount_cents, 0) > 0
		  AND COALESCE(s.spent_cents, 0) >= COALESCE(b.allocated_amount_cents, 0) * 0.80
		ORDER BY b.name ASC
	`)
	if err != nil {
		log.Printf("jobs: budget alerts query error: %v", err)
		return
	}
	defer rows.Close()

	type budgetRow struct {
		id         string
		userID     string
		name       string
		totalCents int64
		spentCents int64
	}
	var budgets []budgetRow
	for rows.Next() {
		var b budgetRow
		if err := rows.Scan(&b.id, &b.userID, &b.name, &b.totalCents, &b.spentCents); err != nil {
			log.Printf("jobs: budget alert scan error: %v", err)
			continue
		}
		budgets = append(budgets, b)
	}
	rows.Close()

	for _, b := range budgets {
		percent := float64(b.spentCents) / float64(b.totalCents) * 100

		thresholds := []int{80, 100}
		for _, threshold := range thresholds {
			if percent < float64(threshold) {
				continue
			}
			var exists bool
			err := s.db.QueryRow(s.ctx, `
				SELECT EXISTS(
					SELECT 1 FROM budget_alerts
					WHERE budget_id = $1
					  AND threshold_pct = $2
					  AND created_at::date = $3::date
				)
			`, b.id, threshold, today).Scan(&exists)
			if err != nil {
				log.Printf("jobs: budget alert debounce check error: %v", err)
				continue
			}
			if exists {
				continue
			}
			_, err = s.db.Exec(s.ctx, `
				INSERT INTO budget_alerts
					(user_id, budget_id, budget_name, threshold_pct, percent_used, allocated_cents, spent_cents)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
			`, b.userID, b.id, b.name, threshold, percent, b.totalCents, b.spentCents)
			if err != nil {
				log.Printf("jobs: budget alert insert error budget=%s threshold=%d: %v", b.id, threshold, err)
			}
		}
	}
}
