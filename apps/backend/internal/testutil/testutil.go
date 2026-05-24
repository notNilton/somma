package testutil

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nilbyte/tallyoh/backend/internal/cache"
	"github.com/nilbyte/tallyoh/backend/internal/handlers"
	"github.com/nilbyte/tallyoh/backend/internal/routes"
)

var JWTKey = []byte("test-secret-key")

var migrateOnce sync.Once
var migrateErr error

// Setup conecta no banco de teste e retorna pool + handler + mux.
// Usa DATABASE_URL quando disponível. Sem DATABASE_URL, tenta o DSN local padrão.
// Se o banco padrão local não estiver disponível, o teste é pulado com instrução clara.
func Setup(t *testing.T) (*pgxpool.Pool, *http.ServeMux) {
	t.Helper()

	dsn := os.Getenv("DATABASE_URL")
	usingDefaultDSN := dsn == ""
	if dsn == "" {
		dsn = "postgres://postgres:postgres@localhost:5454/tallyoh_test?sslmode=disable"
	}
	dsn = normalizeDSN(dsn)

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatalf("testutil: connect db: %v", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		if usingDefaultDSN {
			pool.Close()
			t.Skipf("testutil: banco de integração indisponível em %s; suba o banco de teste ou defina DATABASE_URL: %v", dsn, err)
		}
		t.Fatalf("testutil: ping db: %v", err)
	}

	if err := ensureMigrations(dsn); err != nil {
		t.Fatalf("testutil: migrate db: %v", err)
	}

	t.Cleanup(func() { pool.Close() })

	mux := http.NewServeMux()
	routes.Register(mux, pool, JWTKey, cache.New(), false)

	return pool, mux
}

// CleanTables trunca todas as tabelas em ordem segura (FK).
func CleanTables(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	tables := []string{
		"transactions",
		"budgets",
		"categories",
		"users",
	}
	for _, tbl := range tables {
		if _, err := pool.Exec(context.Background(), fmt.Sprintf("DELETE FROM %s", tbl)); err != nil {
			t.Fatalf("testutil: clean %s: %v", tbl, err)
		}
	}
}

// RegisterUser registra um usuário e retorna o token JWT.
func RegisterUser(t *testing.T, mux *http.ServeMux, email, password string) string {
	t.Helper()
	body := map[string]string{"email": email, "password": password}
	rec := Do(t, mux, "POST", "/auth/register", body, "")
	if rec.Code != http.StatusCreated {
		t.Fatalf("RegisterUser: got %d, body: %s", rec.Code, rec.Body.String())
	}
	return Token(t, rec)
}

// Do executa uma request no mux e retorna o ResponseRecorder.
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

// Token extrai o sessionToken do body JSON.
func Token(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	var resp map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Token: unmarshal: %v", err)
	}
	tok, ok := resp["sessionToken"]
	if !ok {
		t.Fatalf("Token: sessionToken not found in %s", rec.Body.String())
	}
	return tok
}

// DecodeJSON decodifica o body JSON do recorder em v.
func DecodeJSON(t *testing.T, rec *httptest.ResponseRecorder, v any) {
	t.Helper()
	if err := json.Unmarshal(rec.Body.Bytes(), v); err != nil {
		t.Fatalf("DecodeJSON: %v (body: %s)", err, rec.Body.String())
	}
}

// NewHandler cria um Handler isolado para testes que precisam injetar deps direto.
func NewHandler(pool *pgxpool.Pool) *handlers.Handler {
	return handlers.New(pool, JWTKey, cache.New(), false)
}

func ensureMigrations(dsn string) error {
	migrateOnce.Do(func() {
		_, filename, _, ok := runtime.Caller(0)
		if !ok {
			migrateErr = fmt.Errorf("runtime caller failed")
			return
		}

		root := filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..", ".."))
		if err := resetTestDatabase(dsn); err != nil {
			migrateErr = fmt.Errorf("reset test db: %v", err)
			return
		}

		run := func() ([]byte, error) {
			cmd := exec.Command("go", "run", "./cmd/migrate", "up")
			cmd.Dir = filepath.Join(root, "database")
			cmd.Env = append(os.Environ(), "DATABASE_URL="+dsn)
			return cmd.CombinedOutput()
		}

		if out, err := run(); err != nil {
			if err != nil {
				migrateErr = fmt.Errorf("%v: %s", err, string(out))
			}
		}
	})
	return migrateErr
}

func resetTestDatabase(dsn string) error {
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		return err
	}
	defer pool.Close()

	for _, stmt := range []string{
		`DROP SCHEMA IF EXISTS public CASCADE`,
		`CREATE SCHEMA public`,
		`GRANT ALL ON SCHEMA public TO public`,
	} {
		if _, err := pool.Exec(context.Background(), stmt); err != nil {
			return err
		}
	}
	return nil
}

func normalizeDSN(dsn string) string {
	if strings.Contains(dsn, "sslmode=") {
		return dsn
	}
	if strings.Contains(dsn, "?") {
		return dsn + "&sslmode=disable"
	}
	return dsn + "?sslmode=disable"
}
