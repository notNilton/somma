package jobs

import (
	"context"
	"log"
	"os"
	"strconv"
	"time"
)

// archiveOldTransactions moves transactions older than N months to transactions_archive.
func (s *Scheduler) archiveOldTransactions() {
	ctx, cancel := context.WithTimeout(s.ctx, 5*time.Minute)
	defer cancel()

	months := 24 // default: retain 24 months in hot transactions table
	if raw := os.Getenv("TRANSACTION_ARCHIVE_MONTHS"); raw != "" {
		if val, err := strconv.Atoi(raw); err == nil && val > 0 {
			months = val
		}
	}

	cutoff := time.Now().UTC().AddDate(0, -months, 0)
	log.Printf("jobs: archive-transactions: starting archival for transactions before %s (%d months cutoff)", cutoff.Format("2006-01-02"), months)

	// Step 1: Copy transactions older than cutoff into transactions_archive
	queryInsert := `
		INSERT INTO transactions_archive (
			id, user_id, category_id, budget_id,
			type, kind, status, amount_cents, date,
			description, notes, currency_code, is_active, deleted_at, created_at, updated_at,
			is_recurring, recurrence_freq, recurrence_end_date, recurring_origin_id, goal_id,
			card_id, account_id, installment_group_id, installment_number, total_installments,
			is_invoice_payment, transfer_id, is_transfer,
			original_amount_cents, exchange_rate, iof_amount_cents, archived_at
		)
		SELECT 
			id, user_id, category_id, budget_id,
			type, kind, status, amount_cents, date,
			description, notes, currency_code, is_active, deleted_at, created_at, updated_at,
			is_recurring, recurrence_freq, recurrence_end_date, recurring_origin_id, goal_id,
			card_id, account_id, installment_group_id, installment_number, total_installments,
			is_invoice_payment, transfer_id, is_transfer,
			original_amount_cents, exchange_rate, iof_amount_cents, NOW()
		FROM transactions
		WHERE date < $1
		ON CONFLICT (id) DO UPDATE SET
			is_active = EXCLUDED.is_active,
			deleted_at = EXCLUDED.deleted_at,
			updated_at = EXCLUDED.updated_at,
			archived_at = NOW()
	`

	resInsert, err := s.db.Exec(ctx, queryInsert, cutoff)
	if err != nil {
		log.Printf("jobs: archive-transactions error copying to archive: %v", err)
		return
	}

	// Step 2: Delete archived transactions from primary transactions table
	queryDelete := `
		DELETE FROM transactions
		WHERE date < $1
	`
	resDelete, err := s.db.Exec(ctx, queryDelete, cutoff)
	if err != nil {
		log.Printf("jobs: archive-transactions error purging hot transactions: %v", err)
		return
	}

	log.Printf("jobs: archive-transactions completed: copied=%d, purged=%d", resInsert.RowsAffected(), resDelete.RowsAffected())
}
