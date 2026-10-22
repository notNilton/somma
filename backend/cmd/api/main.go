package main

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/nilbyte/somma/backend/internal/config"
	"github.com/nilbyte/somma/backend/internal/database"
	"github.com/nilbyte/somma/backend/internal/handlers"
	"github.com/nilbyte/somma/backend/internal/middleware"
	"github.com/nilbyte/somma/backend/internal/routes"
	"github.com/nilbyte/somma/backend/internal/services"
	dbpkg "github.com/nilbyte/somma/database"
)

func main() {
	log.Printf("STARTING BACKEND - SOMMA FINANCE")

	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found")
	}

	cfg := config.Load()
	log.Printf("CHECKPOINT: Config loaded (Env: %s, Port: %s)", cfg.Env, cfg.Port)

	db, err := dbpkg.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("FATAL: failed to connect to database: %v", err)
	}
	defer db.Close()
	log.Printf("CHECKPOINT: Database connected successfully")

	_, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Inicialização da nova arquitetura (sqlc + services + handlers)
	queries := database.New(db)
	cardService := services.NewCardService(db, queries)
	paymentService := services.NewPaymentService(db, queries)
	h := handlers.New(db, queries, cardService, paymentService, []byte(cfg.JWTSecret))

	mux := http.NewServeMux()
	routes.Register(mux, h, []byte(cfg.JWTSecret))

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
	rl := middleware.NewRateLimiter(5, 30)
	handler := middleware.CORS(cfg.WebappURL, cfg.IsProduction())(rl.Limit(securityHeaders(logger(mux))))
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
