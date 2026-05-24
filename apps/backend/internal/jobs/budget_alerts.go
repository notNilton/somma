package jobs

import (
	"log"
	"time"
)

func (s *Scheduler) checkBudgetAlerts() {
	now := time.Now().UTC()

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
		  AND COALESCE(s.spent_cents, 0) >= COALESCE(b.allocated_amount_cents, 0)
		ORDER BY b.name ASC
	`, now)
	if err != nil {
		log.Printf("jobs: budget alerts error: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var budgetID, userID, budgetName string
		var totalCents, spentCents int64
		if err := rows.Scan(&budgetID, &userID, &budgetName, &totalCents, &spentCents); err != nil {
			log.Printf("jobs: budget alert scan error: %v", err)
			continue
		}
		percent := float64(spentCents) / float64(totalCents) * 100
		log.Printf(
			"jobs: BUDGET ALERT user=%s budget=%q target=%s used=%.0f%% (spent=%d limit=%d id=%s)",
			userID,
			budgetName,
			now.Format("2006-01-02"),
			percent,
			spentCents,
			totalCents,
			budgetID,
		)
	}
}
