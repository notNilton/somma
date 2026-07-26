package database

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(dsn string) (*pgxpool.Pool, error) {
	var pool *pgxpool.Pool
	var err error

	for i := 0; i < 5; i++ {
		pool, err = pgxpool.New(context.Background(), dsn)
		if err == nil {
			err = pool.Ping(context.Background())
			if err == nil {
				return pool, nil
			}
		}

		log.Printf("failed to connect to database (attempt %d/5): %v. retrying in 2s...", i+1, err)
		time.Sleep(2 * time.Second)
	}

	return nil, err
}
