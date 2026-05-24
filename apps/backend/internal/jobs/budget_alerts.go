package jobs

import (
	"log"
	"time"
)

func (s *Scheduler) checkBudgetAlerts() {
	now := time.Now().UTC()

	rows, err := s.db.Query(s.ctx, `
		WITH budget_summary AS (
			SELECT budget_id,
			       SUM(CASE WHEN type = 'INCOME' THEN amount_cents ELSE 0 END) AS budgeted_cents,
			       SUM(CASE WHEN type = 'EXPENSE' THEN amount_cents ELSE 0 END) AS spent_cents
			FROM transactions
			WHERE is_active = true
			  AND status = 'COMPLETED'
			  AND budget_id IS NOT NULL
			GROUP BY budget_id
		)
		SELECT b.id, b.user_id, b.name, b.target_date,
		       COALESCE(s.budgeted_cents, 0) AS total_cents,
		       COALESCE(s.spent_cents, 0) AS spent_cents
		FROM budgets b
		LEFT JOIN budget_summary s ON s.budget_id = b.id
		WHERE b.is_active = true
		  AND COALESCE(s.budgeted_cents, 0) > 0
		  AND COALESCE(s.spent_cents, 0) >= COALESCE(s.budgeted_cents, 0)
		  AND b.target_date <= $1::date
		ORDER BY b.target_date ASC, b.name ASC
	`, now)
	if err != nil {
		log.Printf("jobs: budget alerts error: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var budgetID, userID, budgetName string
		var targetDate time.Time
		var totalCents, spentCents int64
		if err := rows.Scan(&budgetID, &userID, &budgetName, &targetDate, &totalCents, &spentCents); err != nil {
			log.Printf("jobs: budget alert scan error: %v", err)
			continue
		}
		percent := float64(spentCents) / float64(totalCents) * 100
		log.Printf(
			"jobs: BUDGET ALERT user=%s budget=%q target=%s used=%.0f%% (spent=%d limit=%d id=%s)",
			userID,
			budgetName,
			targetDate.Format("2006-01-02"),
			percent,
			spentCents,
			totalCents,
			budgetID,
		)
	}
}
