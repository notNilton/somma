# Guia de Migração: NestJS → Go (para LLMs)

Este documento instrui uma LLM a migrar um backend NestJS/Prisma para Go puro.
Siga a ordem dos módulos. Cada módulo é autocontido.

---

## Stack de destino

| NestJS (origem)           | Go (destino)                                      |
| ------------------------- | ------------------------------------------------- |
| NestJS framework          | `net/http` stdlib (Go 1.24+)                      |
| Prisma ORM                | `pgx/v5` com SQL explícito — sem ORM              |
| class-validator / DTO     | struct + método `validate() error` manual         |
| `@nestjs/jwt`             | `github.com/golang-jwt/jwt/v5`                    |
| `bcryptjs`                | `golang.org/x/crypto/bcrypt`                      |
| `@CurrentUser()` decorator| `middleware.ClaimsFromContext(r.Context())`        |
| `PartialType` DTOs        | campos opcionais com ponteiro `*string`, `*int64` |
| Soft delete Prisma        | SQL: `WHERE is_active = true`                     |
| `Decimal` / float money   | `int64` centavos — R$ 10,50 = `1050`              |
| `dotenv` / ConfigModule   | `os.Getenv` puro — sem biblioteca                 |
| `@nestjs/serve-static`    | nginx na frente (Dockerfile separado)             |
| Prisma migrations         | `golang-migrate/v4` com arquivos `.sql` puros     |

**go.mod — apenas 3 dependências diretas:**

```
github.com/golang-jwt/jwt/v5
github.com/jackc/pgx/v5
golang.org/x/crypto
```

golang-migrate é usado apenas no binário `cmd/migrate`, não no servidor.

---

## Estrutura de pastas

```
apps/backend/
├── cmd/
│   ├── api/main.go          ← entry point do servidor
│   └── migrate/main.go      ← CLI de migrations
├── internal/
│   ├── config/config.go     ← os.Getenv, sem dotenv
│   ├── database/database.go ← pgxpool.Pool
│   ├── handlers/            ← um arquivo por módulo
│   │   ├── handlers.go      ← struct Handler + writeJSON/writeError
│   │   ├── auth.go
│   │   ├── users.go
│   │   ├── accounts.go
│   │   └── ...
│   ├── middleware/auth.go   ← JWT middleware + ClaimsFromContext
│   ├── models/              ← structs Go sem tags ORM
│   ├── money/money.go       ← ToCents / ToReais
│   ├── routes/routes.go     ← http.ServeMux com Go 1.22 patterns
│   └── version/version.go   ← string injetada via ldflags
└── go.mod
```

---

## Padrões obrigatórios

### 1. Handler base

```go
// internal/handlers/handlers.go
package handlers

import (
    "encoding/json"
    "net/http"
    "github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
    db     *pgxpool.Pool
    jwtKey []byte
}

func New(db *pgxpool.Pool, jwtKey []byte) *Handler {
    return &Handler{db: db, jwtKey: jwtKey}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
    writeJSON(w, status, map[string]string{"error": msg})
}
```

### 2. Handler típico — ListAccounts

```go
func (h *Handler) ListAccounts(w http.ResponseWriter, r *http.Request) {
    claims := middleware.ClaimsFromContext(r.Context())

    rows, err := h.db.Query(r.Context(), `
        SELECT id, name, type, balance_cents, is_active
        FROM accounts
        WHERE user_id = $1 AND is_active = true
        ORDER BY name
    `, claims.UserID)
    if err != nil {
        writeError(w, http.StatusInternalServerError, "internal error")
        return
    }
    defer rows.Close()

    type row struct {
        ID           string `json:"id"`
        Name         string `json:"name"`
        Type         string `json:"type"`
        Balance      float64 `json:"balance"`
    }
    var result []row
    for rows.Next() {
        var r row
        var balanceCents int64
        if err := rows.Scan(&r.ID, &r.Name, &r.Type, &balanceCents); err != nil {
            writeError(w, http.StatusInternalServerError, "internal error")
            return
        }
        r.Balance = money.ToReais(balanceCents)
        result = append(result, r)
    }
    if result == nil {
        result = []row{}
    }
    writeJSON(w, http.StatusOK, result)
}
```

### 3. DTO com validação manual

```go
type createAccountDto struct {
    Name        string   `json:"name"`
    Type        string   `json:"type"`
    Balance     *float64 `json:"balance"`
    CreditLimit *float64 `json:"creditLimit"`
}

func (d *createAccountDto) validate() error {
    if d.Name == "" {
        return errors.New("name is required")
    }
    valid := map[string]bool{
        "CHECKING": true, "SAVINGS": true,
        "CASH": true, "WALLET": true, "INVESTMENT": true,
    }
    if !valid[d.Type] {
        return errors.New("invalid account type")
    }
    return nil
}

// No handler:
var dto createAccountDto
if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
    writeError(w, http.StatusBadRequest, "invalid json")
    return
}
if err := dto.validate(); err != nil {
    writeError(w, http.StatusBadRequest, err.Error())
    return
}
```

### 4. Valores monetários

```go
// internal/money/money.go
package money

import "math"

func ToCents(reais float64) int64  { return int64(math.Round(reais * 100)) }
func ToReais(cents int64) float64  { return float64(cents) / 100.0 }

func ToCentsPtr(reais *float64) *int64 {
    if reais == nil { return nil }
    v := ToCents(*reais)
    return &v
}
func ToReaisPtr(cents *int64) *float64 {
    if cents == nil { return nil }
    v := ToReais(*cents)
    return &v
}
```

Banco sempre `BIGINT` (centavos). API sempre recebe/envia `float64` (reais).

### 5. Roteamento Go 1.22

```go
// internal/routes/routes.go
func Register(mux *http.ServeMux, db *pgxpool.Pool, jwtKey []byte) {
    h := handlers.New(db, jwtKey)
    auth := middleware.Auth(jwtKey)

    mux.HandleFunc("GET /health", h.Health)

    // Auth (público)
    mux.HandleFunc("POST /auth/register", h.Register)
    mux.HandleFunc("POST /auth/login",    h.Login)

    // Accounts
    mux.HandleFunc("GET    /api/v1/accounts",                auth(h.ListAccounts))
    mux.HandleFunc("GET    /api/v1/accounts/{id}",           auth(h.GetAccount))
    mux.HandleFunc("POST   /api/v1/accounts",                auth(h.CreateAccount))
    mux.HandleFunc("PATCH  /api/v1/accounts/{id}",           auth(h.UpdateAccount))
    mux.HandleFunc("DELETE /api/v1/accounts/{id}",           auth(h.DeleteAccount))

    // ... demais módulos
}

// Extrair path param:
id := r.PathValue("id")
```

### 6. Middleware de auth

```go
// internal/middleware/auth.go
type AuthClaims struct {
    UserID string
    Email  string
}

func Auth(jwtKey []byte) func(http.HandlerFunc) http.HandlerFunc {
    return func(next http.HandlerFunc) http.HandlerFunc {
        return func(w http.ResponseWriter, r *http.Request) {
            header := r.Header.Get("Authorization")
            if !strings.HasPrefix(header, "Bearer ") {
                http.Error(w, `{"error":"missing token"}`, http.StatusUnauthorized)
                return
            }
            tokenStr := strings.TrimPrefix(header, "Bearer ")
            token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
                if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
                    return nil, jwt.ErrSignatureInvalid
                }
                return jwtKey, nil
            })
            if err != nil || !token.Valid {
                http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
                return
            }
            claims := token.Claims.(jwt.MapClaims)
            ac := AuthClaims{
                UserID: claims["sub"].(string),
                Email:  claims["email"].(string),
            }
            ctx := context.WithValue(r.Context(), claimsKey, ac)
            next(w, r.WithContext(ctx))
        }
    }
}

func ClaimsFromContext(ctx context.Context) AuthClaims {
    return ctx.Value(claimsKey).(AuthClaims)
}
```

### 7. Soft delete — padrão obrigatório

Nunca deletar fisicamente. Sempre:

```go
// DELETE handler:
_, err := h.db.Exec(r.Context(), `
    UPDATE accounts
    SET is_active = false, deleted_at = NOW()
    WHERE id = $1 AND user_id = $2 AND is_active = true
`, id, claims.UserID)
```

Todos os SELECTs filtram `AND is_active = true`.

### 8. Datas em UTC 12:00

Para evitar problemas de fuso, salvar datas como:

```go
// Recebe string "2026-03-25", salva como UTC 12:00:
date, _ := time.Parse("2006-01-02", dto.Date)
dateUTC := time.Date(date.Year(), date.Month(), date.Day(), 12, 0, 0, 0, time.UTC)
```

### 9. Erro de chave duplicada (unique constraint)

```go
import "github.com/jackc/pgx/v5/pgconn"

var pgErr *pgconn.PgError
if errors.As(err, &pgErr) && pgErr.Code == "23505" {
    writeError(w, http.StatusConflict, "already exists")
    return
}
```

### 10. Verificar ownership antes de retornar

Sempre filtrar `AND user_id = $N` nas queries, nunca confiar só no `id`:

```go
var account Account
err := h.db.QueryRow(r.Context(), `
    SELECT id, name, balance_cents
    FROM accounts
    WHERE id = $1 AND user_id = $2 AND is_active = true
`, id, claims.UserID).Scan(&account.ID, &account.Name, &account.BalanceCents)
if err != nil {
    writeError(w, http.StatusNotFound, "not found")
    return
}
```

---

## Config e entry point

```go
// internal/config/config.go
type Config struct {
    Port        string
    DatabaseURL string
    JWTSecret   string
    Env         string
}

func Load() Config {
    return Config{
        Port:        getEnv("PORT", "3000"),
        DatabaseURL: mustEnv("DATABASE_URL"),
        JWTSecret:   mustEnv("JWT_SECRET"),
        Env:         getEnv("ENV", "development"),
    }
}

func mustEnv(key string) string {
    v := os.Getenv(key)
    if v == "" { panic("missing env: " + key) }
    return v
}
func getEnv(key, fallback string) string {
    if v := os.Getenv(key); v != "" { return v }
    return fallback
}
```

```go
// cmd/api/main.go
func main() {
    cfg := config.Load()
    db, err := database.Connect(cfg.DatabaseURL)
    if err != nil { log.Fatal(err) }
    defer db.Close()

    mux := http.NewServeMux()
    routes.Register(mux, db, []byte(cfg.JWTSecret))

    log.Printf("server on :%s", cfg.Port)
    log.Fatal(http.ListenAndServe(":"+cfg.Port, mux))
}
```

---

## Schema SQL — convenções

```sql
-- IDs como UUID em TEXT
id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,

-- Timestamps
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
deleted_at TIMESTAMPTZ,

-- Soft delete
is_active BOOLEAN NOT NULL DEFAULT TRUE,

-- Dinheiro em centavos
balance_cents      BIGINT NOT NULL DEFAULT 0,
credit_limit_cents BIGINT,

-- Medidas físicas
liters    NUMERIC(10,3),
current_km NUMERIC(10,2),

-- Enums como strings
type TEXT NOT NULL CHECK (type IN ('CHECKING','SAVINGS','CASH','WALLET','INVESTMENT')),
```

Migrations em `database/migrations/NNNNNN_descricao.up.sql` e `.down.sql`.

---

## Ordem de implementação

Execute nessa ordem exata:

1. `go.mod` — 3 deps: jwt/v5, pgx/v5, crypto
2. `internal/config/config.go`
3. `internal/database/database.go` — pgxpool.New + Ping
4. `internal/money/money.go`
5. `internal/middleware/auth.go`
6. `internal/handlers/handlers.go` — struct Handler + helpers
7. `internal/handlers/auth.go` — Register + Login
8. `internal/handlers/users.go` — GetMe + UpdateMe
9. `internal/handlers/accounts.go` — CRUD + GetCreditSummary
10. `internal/handlers/cards.go` — CRUD
11. `internal/handlers/categories.go` — CRUD + tree
12. `internal/handlers/tags.go` — CRUD
13. `internal/handlers/transactions.go` — CRUD + future + ImportCSV
14. `internal/handlers/vehicles.go` — CRUD + refuelings + maintenances + stats
15. `internal/handlers/dashboard.go`
16. `internal/handlers/settings.go`
17. `internal/routes/routes.go` — registrar tudo
18. `cmd/api/main.go`
19. `cmd/migrate/main.go`
20. `database/migrations/000001_initial_schema.up.sql` + `.down.sql`

---

## Regras de negócio críticas

| Regra | Detalhe |
|---|---|
| Sem CREDIT_CARD | `account_type`: CHECKING, SAVINGS, CASH, WALLET, INVESTMENT |
| Crédito na conta | Campo `credit_limit_cents` na própria conta |
| Toggle DEBIT/CREDIT | `payment_method` enum — só aparece se conta tem `credit_limit_cents > 0` |
| `affects_account` | Transações de cartão CREDIT: `false` — não afeta saldo da conta |
| Soft delete | `is_active = false + deleted_at = NOW()` — nunca DELETE físico |
| Datas | UTC 12:00 para evitar problema de timezone |
| Centavos | BIGINT no banco, int64 no Go, float64 na API |
| Ownership | PERSONAL → cpf, BUSINESS → cnpj |
| CSV dedup | SHA256 da linha → `import_fingerprints` ON CONFLICT DO NOTHING |

---

## Variáveis de ambiente

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tallyoh?sslmode=disable
JWT_SECRET=seu_secret_aqui
ENV=development
```

**Sem godotenv.** Setar no ambiente antes de rodar:

```bash
export DATABASE_URL="postgresql://..."
export JWT_SECRET="dev-secret"
go run ./cmd/api
```
