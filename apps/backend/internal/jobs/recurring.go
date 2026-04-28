package jobs

import (
	"log"
	"time"
)

func (s *Scheduler) checkRecurringTransactions() {
	rows, err := s.db.Query(s.ctx, `
		SELECT id, user_id, category_id, type, amount_cents,
		       description, date, currency_code
		FROM transactions
		WHERE is_recurring = true
		  AND is_active = true
		  AND status = 'PENDING'
		  AND date <= NOW()
	`)
	if err != nil {
		log.Printf("jobs: recurring check error: %v", err)
		return
	}
	defer rows.Close()

	type pendingTx struct {
		ID, UserID        string
		CategoryID        *string
		Type, Description string
		CurrencyCode      string
		AmountCents       int64
		Date              time.Time
	}

	var pending []pendingTx
	for rows.Next() {
		var tx pendingTx
		if err := rows.Scan(&tx.ID, &tx.UserID, &tx.CategoryID,
			&tx.Type, &tx.AmountCents, &tx.Description, &tx.Date, &tx.CurrencyCode); err != nil {
			log.Printf("jobs: recurring scan error: %v", err)
			continue
		}
		pending = append(pending, tx)
	}
	rows.Close()

	for _, tx := range pending {
		// Marcar como COMPLETED
		_, err := s.db.Exec(s.ctx, `
			UPDATE transactions SET status = 'COMPLETED', updated_at = NOW()
			WHERE id = $1
		`, tx.ID)
		if err != nil {
			log.Printf("jobs: recurring complete error for tx %s: %v", tx.ID, err)
			continue
		}

		// Criar próxima ocorrência (1 mês à frente)
		nextDate := time.Date(tx.Date.Year(), tx.Date.Month()+1, tx.Date.Day(), 12, 0, 0, 0, time.UTC)
		_, err = s.db.Exec(s.ctx, `
			INSERT INTO transactions (
				user_id, category_id, type, amount_cents,
				date, description, currency_code, is_recurring, status, affects_account
			) VALUES ($1,$2,$3,$4,$5,$6,$7,true,'PENDING',true)
		`, tx.UserID, tx.CategoryID, tx.Type, tx.AmountCents,
			nextDate, tx.Description, tx.CurrencyCode)
		if err != nil {
			log.Printf("jobs: recurring create next error for tx %s: %v", tx.ID, err)
		} else {
			log.Printf("jobs: recurring tx %s completed, next on %s", tx.ID, nextDate.Format("2006-01-02"))
		}
	}
}
