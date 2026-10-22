package testutil

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nilbyte/somma/backend/internal/database"
	"github.com/nilbyte/somma/backend/internal/handlers"
	"github.com/nilbyte/somma/backend/internal/routes"
	"github.com/nilbyte/somma/backend/internal/services"
)

var JWTKey = []byte("test-jwt-secret-key-32-bytes-long!")

var (
	migrateOnce sync.Once
	migrateErr  error
)

func SetupTestApp(t *testing.T) (*pgxpool.Pool, *http.ServeMux) {
	t.Helper()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://somma:somma@localhost:5432/somma_test?sslmode=disable"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatalf("testutil: parse dsn: %v", err)
	}

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatalf("testutil: connect db: %v", err)
	}

	if err := pool.Ping(ctx); err != nil {
		if os.Getenv("CI") == "" {
			pool.Close()
			t.Skipf("testutil: banco de integração indisponível em %s: %v", dsn, err)
		}
		t.Fatalf("testutil: ping db: %v", err)
	}

	t.Cleanup(func() { pool.Close() })

	queries := database.New(pool)
	cardService := services.NewCardService(pool, queries)
	paymentService := services.NewPaymentService(pool, queries)
	h := handlers.New(pool, queries, cardService, paymentService, JWTKey)

	mux := http.NewServeMux()
	routes.Register(mux, h, JWTKey)

	return pool, mux
}

func CleanTables(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	tables := []string{
		"invoice_installments",
		"credit_card_purchases",
		"account_transactions",
		"credit_card_invoices",
		"credit_cards",
		"accounts",
		"users",
	}
	for _, tbl := range tables {
		_, _ = pool.Exec(context.Background(), fmt.Sprintf("DELETE FROM %s", tbl))
	}
}

func Do(t *testing.T, mux *http.ServeMux, method, path string, body any, token string) *httptest.ResponseRecorder {
	t.Helper()
	var b *bytes.Buffer
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("Do: marshal body: %v", err)
		}
		b = bytes.NewBuffer(data)
	} else {
		b = bytes.NewBuffer(nil)
	}

	req := httptest.NewRequest(method, path, b)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	return rec
}

func DecodeJSON(t *testing.T, rec *httptest.ResponseRecorder, v any) {
	t.Helper()
	if err := json.Unmarshal(rec.Body.Bytes(), v); err != nil {
		t.Fatalf("DecodeJSON: %v (body: %s)", err, rec.Body.String())
	}
}

func NewHandler(pool *pgxpool.Pool) *handlers.Handler {
	queries := database.New(pool)
	cardService := services.NewCardService(pool, queries)
	paymentService := services.NewPaymentService(pool, queries)
	return handlers.New(pool, queries, cardService, paymentService, JWTKey)
}
