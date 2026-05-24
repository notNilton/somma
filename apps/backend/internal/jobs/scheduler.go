package jobs

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Scheduler struct {
	db  *pgxpool.Pool
	ctx context.Context
}

func New(db *pgxpool.Pool, ctx context.Context) *Scheduler {
	return &Scheduler{db: db, ctx: ctx}
}

func (s *Scheduler) Start() {
	log.Println("jobs: scheduler started")
	go s.runAt(0, 5, "budget-alerts", s.checkBudgetAlerts)
}

// runEvery executa a função a cada intervalo
func (s *Scheduler) runEvery(interval time.Duration, name string, fn func()) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-s.ctx.Done():
			log.Printf("jobs: %s stopped", name)
			return
		case <-ticker.C:
			log.Printf("jobs: running %s", name)
			fn()
		}
	}
}

// runAt executa a função uma vez por dia no horário especificado (hora, minuto UTC)
func (s *Scheduler) runAt(hour, minute int, name string, fn func()) {
	for {
		now := time.Now().UTC()
		next := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, time.UTC)
		if now.After(next) {
			next = next.AddDate(0, 0, 1)
		}
		wait := time.Until(next)

		select {
		case <-s.ctx.Done():
			log.Printf("jobs: %s stopped", name)
			return
		case <-time.After(wait):
			log.Printf("jobs: running %s", name)
			fn()
		}
	}
}
