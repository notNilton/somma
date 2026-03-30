package jobs

import (
	"log"
	"time"
)

func (s *Scheduler) checkInvoiceDue() {
	now := time.Now().UTC()
	// Avisar quando faltarem 3 dias para o vencimento
	targetDay := now.AddDate(0, 0, 3).Day()

	rows, err := s.db.Query(s.ctx, `
		SELECT c.id, c.user_id, c.name, c.due_day
		FROM cards c
		WHERE c.is_active = true
		  AND c.due_day = $1
	`, targetDay)
	if err != nil {
		log.Printf("jobs: invoice alerts error: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var cardID, userID, cardName string
		var dueDay int
		if err := rows.Scan(&cardID, &userID, &cardName, &dueDay); err != nil {
			log.Printf("jobs: invoice alert scan error: %v", err)
			continue
		}
		dueDate := time.Date(now.Year(), now.Month(), dueDay, 0, 0, 0, 0, time.UTC)
		log.Printf("jobs: INVOICE DUE SOON user=%s card=%q due=%s (in 3 days)",
			userID, cardName, dueDate.Format("2006-01-02"))
	}
}
