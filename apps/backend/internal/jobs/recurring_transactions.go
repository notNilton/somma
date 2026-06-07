package jobs

import (
	"context"
	"log"
	"time"
)

type recurringTemplate struct {
	id               string
	userID           string
	categoryID       *string
	budgetID         *string
	txType           string
	kind             string
	amountCents      int64
	description      string
	notes            *string
	currencyCode     string
	recurrenceFreq   string
	recurrenceEndDate *time.Time
}

func computeNextDate(base time.Time, freq string) time.Time {
	switch freq {
	case "DAILY":
		return base.AddDate(0, 0, 1)
	case "WEEKLY":
		return base.AddDate(0, 0, 7)
	case "YEARLY":
		return base.AddDate(1, 0, 0)
	default: // MONTHLY
		return base.AddDate(0, 1, 0)
	}
}

func (s *Scheduler) spawnRecurring() {
	ctx, cancel := context.WithTimeout(s.ctx, 5*time.Minute)
	defer cancel()

	rows, err := s.db.Query(ctx, `
		SELECT id, user_id, category_id, budget_id, type, kind,
		       amount_cents, description, notes, currency_code,
		       recurrence_freq, recurrence_end_date
		FROM transactions
		WHERE is_active = true
		  AND is_recurring = true
		  AND recurring_origin_id IS NULL
		  AND recurrence_freq IS NOT NULL
	`)
	if err != nil {
		log.Printf("jobs: recurring: query templates: %v", err)
		return
	}
	defer rows.Close()

	var templates []recurringTemplate
	for rows.Next() {
		var t recurringTemplate
		if err := rows.Scan(
			&t.id, &t.userID, &t.categoryID, &t.budgetID, &t.txType, &t.kind,
			&t.amountCents, &t.description, &t.notes, &t.currencyCode,
			&t.recurrenceFreq, &t.recurrenceEndDate,
		); err != nil {
			log.Printf("jobs: recurring: scan template: %v", err)
			continue
		}
		templates = append(templates, t)
	}
	rows.Close()

	today := time.Now().UTC().Truncate(24 * time.Hour)
	spawned := 0

	for _, t := range templates {
		// Find the latest occurrence date (template itself OR any copy)
		var latestDate time.Time
		s.db.QueryRow(ctx, `
			SELECT COALESCE(MAX(date), '1970-01-01'::date)
			FROM transactions
			WHERE (id = $1 OR recurring_origin_id = $1)
			  AND is_active = true
		`, t.id).Scan(&latestDate)
		latestDate = latestDate.UTC().Truncate(24 * time.Hour)

		nextDate := computeNextDate(latestDate, t.recurrenceFreq)

		// Create all missed occurrences up to today
		for !nextDate.After(today) {
			if t.recurrenceEndDate != nil && nextDate.After(*t.recurrenceEndDate) {
				break
			}

			// Skip if copy already exists for this exact date
			var exists bool
			s.db.QueryRow(ctx, `
				SELECT EXISTS(
					SELECT 1 FROM transactions
					WHERE recurring_origin_id = $1
					  AND DATE(date) = $2
					  AND is_active = true
				)
			`, t.id, nextDate.Format("2006-01-02")).Scan(&exists)

			if !exists {
				_, err := s.db.Exec(ctx, `
					INSERT INTO transactions (
						user_id, category_id, budget_id, type, kind, status,
						amount_cents, date, description, notes, currency_code,
						recurring_origin_id
					) VALUES ($1,$2,$3,$4,$5,'COMPLETED',$6,$7,$8,$9,$10,$11)
				`, t.userID, t.categoryID, t.budgetID, t.txType, t.kind,
					t.amountCents, nextDate, t.description, t.notes, t.currencyCode,
					t.id,
				)
				if err != nil {
					log.Printf("jobs: recurring: insert copy for %s on %s: %v", t.id, nextDate.Format("2006-01-02"), err)
				} else {
					spawned++
				}
			}

			nextDate = computeNextDate(nextDate, t.recurrenceFreq)
		}
	}

	if spawned > 0 {
		log.Printf("jobs: recurring: spawned %d transaction(s)", spawned)
	}
}
