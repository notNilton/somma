package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/joho/godotenv"
	"github.com/nilbyte/mirante/backend/internal/cache"
	"github.com/nilbyte/mirante/backend/internal/config"
	"github.com/nilbyte/mirante/backend/internal/jobs"
	"github.com/nilbyte/mirante/backend/internal/routes"
	"github.com/nilbyte/mirante/database"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found")
	}

	cfg := config.Load()

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	c := cache.New()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	scheduler := jobs.New(db, ctx)
	scheduler.Start()

	mux := http.NewServeMux()
	routes.Register(mux, db, []byte(cfg.JWTSecret), c)



	logger := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rw := &responseWriter{ResponseWriter: w, status: 200}
			next.ServeHTTP(rw, r)
			elapsed := time.Since(start)
			if elapsed > 500*time.Millisecond {
				log.Printf("SLOW %s %s %d %s", r.Method, r.URL.Path, rw.status, elapsed)
			} else {
				log.Printf("%s %s %d %s", r.Method, r.URL.Path, rw.status, elapsed)
			}
		})
	}

	log.Printf("starting server on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, logger(mux)); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}
