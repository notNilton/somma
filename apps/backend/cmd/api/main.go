package main

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/nilbyte/personalledger/backend/internal/cache"
	"github.com/nilbyte/personalledger/backend/internal/config"
	"github.com/nilbyte/personalledger/backend/internal/jobs"
	"github.com/nilbyte/personalledger/backend/internal/middleware"
	"github.com/nilbyte/personalledger/backend/internal/routes"
	"github.com/nilbyte/personalledger/database"
)

func main() {
	log.Printf("STARTING BACKEND VERSION 1.0.60 (DEBUG)")

	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found")
	}

	log.Printf("CHECKPOINT: Loading config")
	cfg := config.Load()
	log.Printf("CHECKPOINT: Config loaded (Env: %s, Port: %s)", cfg.Env, cfg.Port)

	log.Printf("CHECKPOINT: Connecting to database")
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("FATAL: failed to connect to database: %v", err)
	}
	defer db.Close()
	log.Printf("CHECKPOINT: Database connected successfully")

	c := cache.New()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	log.Printf("CHECKPOINT: Starting scheduler")
	scheduler := jobs.New(db, ctx)
	scheduler.Start()

	log.Printf("CHECKPOINT: Registering routes")
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

	log.Printf("CHECKPOINT: Starting HTTP server on :%s", cfg.Port)
	handler := middleware.CORS(cfg.WebappURL, cfg.IsProduction())(securityHeaders(logger(mux)))
	if err := http.ListenAndServe(":"+cfg.Port, handler); err != nil {
		log.Fatalf("FATAL: server error: %v", err)
	}
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		if r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https") {
			w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
		}
		next.ServeHTTP(w, r)
	})
}

type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}
