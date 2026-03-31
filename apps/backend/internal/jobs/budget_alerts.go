package jobs

import (
	"log"
	"time"
)

func (s *Scheduler) checkBudgetAlerts() {
	now := time.Now().UTC()
	monthDate := now.Format("2006-01") + "-01"

	rows, err := s.db.Query(s.ctx, `
		WITH spent AS (
			SELECT category_id, SUM(amount_cents) AS spent_cents
			FROM transactions
			WHERE is_active = true
			  AND affects_account = true
			  AND type = 'EXPENSE'
			  AND classification != 'TRANSFER'
			  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $1::date)
			GROUP BY category_id
		)
		SELECT b.id, b.user_id, b.amount_cents,
		       COALESCE(c.name, 'Geral') AS category_name,
		       COALESCE(s.spent_cents, 0) AS spent_cents
		FROM budgets b
		LEFT JOIN categories c ON c.id = b.category_id
		LEFT JOIN spent s ON s.category_id IS NOT DISTINCT FROM b.category_id
		WHERE b.is_active = true
		  AND b.month = EXTRACT(MONTH FROM $1::date)
		  AND b.year  = EXTRACT(YEAR  FROM $1::date)
		  AND COALESCE(s.spent_cents, 0) > b.amount_cents
	`, monthDate)
	if err != nil {
		log.Printf("jobs: budget alerts error: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var budgetID, userID, categoryName string
		var amountCents, spentCents int64
		if err := rows.Scan(&budgetID, &userID, &amountCents, &categoryName, &spentCents); err != nil {
			log.Printf("jobs: budget alert scan error: %v", err)
			continue
		}
		percent := float64(spentCents) / float64(amountCents) * 100
		log.Printf("jobs: BUDGET ALERT user=%s category=%q used=%.0f%% (spent=%d limit=%d)",
			userID, categoryName, percent, spentCents, amountCents)
	}
}
