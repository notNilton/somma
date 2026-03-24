# Mirante — Sistema de Gerenciamento Financeiro

Monorepo Go + React + PostgreSQL para controle de gastos, contas bancárias e veículos.

## Estrutura do monorepo

```
apps/backend/        → Go REST API (net/http + pgx/v5)
apps/webapp/         → React + TanStack Router + TanStack Query
database/migrations/ → SQL migrations (golang-migrate)
```

## Comandos principais

```bash
# Backend Go
cd apps/backend
go run ./cmd/api            # servidor local
go run ./cmd/migrate up     # aplica migrations (requer DATABASE_URL)
go run ./cmd/migrate down   # reverte 1 migration
go run ./cmd/migrate version
go build ./...              # compila tudo

# Webapp
cd apps/webapp && npm run dev

# Nova migration
# cria dois arquivos: 000002_<nome>.up.sql e 000002_<nome>.down.sql
# em database/migrations/
```

O banco roda na porta **5433** (variável `DATABASE_URL`).

---

## Arquitetura de contas e transações

### Regra central — sem CREDIT_CARD

**Não existe `CREDIT_CARD` como tipo de conta.** A lógica de crédito é unificada na conta:

- Qualquer conta pode ter `credit_limit_cents` (BIGINT, opcional)
- `payment_method` enum `DEBIT | CREDIT` indica como a transação foi feita
- O toggle DEBIT/CREDIT só aparece no UI se a conta tiver `credit_limit_cents > 0`

`account_type` válidos: `CHECKING | SAVINGS | CASH | WALLET | INVESTMENT`

### Titularidade de contas (`account_ownership`)

- `PERSONAL` → preenche campo `cpf` (VARCHAR 14)
- `BUSINESS` → preenche campo `cnpj` (VARCHAR 18)
- Múltiplas contas **podem** ter o mesmo CPF/CNPJ
- O UNIQUE de CPF/CNPJ existe **somente** na tabela `users`

### Cartões (`cards`)

- Cartões são entidades separadas vinculadas a `accounts` via `account_id`
- `card.type`: `CREDIT | DEBIT`
- `transaction.card_id` é opcional — transações sem cartão são diretas na conta

### Transações e saldo

- `affects_account = false` em transações de cartão CREDIT (não afeta saldo da conta mãe)
- Soft delete: `is_active = false` + `deleted_at` — **nunca deletar fisicamente**
- Datas sempre em UTC 12:00 para evitar problemas de fuso horário
- Valores monetários em **centavos** (BIGINT no banco, int64 no Go)

---

## Padrão de handlers Go

Cada feature é um método no struct `Handler` em `internal/handlers/`:

```go
// Handler central
type Handler struct {
    db     *pgxpool.Pool
    jwtKey []byte
}

// Rotas registradas em internal/routes/routes.go com Go 1.22 patterns:
mux.HandleFunc("GET /api/v1/accounts", h.Auth(h.ListAccounts))
mux.HandleFunc("POST /api/v1/accounts", h.Auth(h.CreateAccount))
mux.HandleFunc("GET /api/v1/accounts/{id}", h.Auth(h.GetAccount))
```

- Middleware de auth injeta `AuthClaims` no contexto via `middleware.ClaimsFromContext(ctx)`
- Validação manual: cada DTO tem método `Validate() error`
- Valores monetários: helpers `money.ToCents()` / `money.ToReais()` em `internal/money/`
- Configuração via `os.Getenv` (sem godotenv): `PORT`, `DATABASE_URL`, `JWT_SECRET`, `ENV`

---

## Convenções SQL / migrations

- Arquivos em `database/migrations/` seguindo padrão `NNNNNN_nome.up.sql` / `.down.sql`
- IDs como `TEXT DEFAULT gen_random_uuid()::TEXT`
- Timestamps como `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Valores monetários como `BIGINT` (centavos)
- Medidas físicas (km, litros) como `NUMERIC(n,m)`

---

## Stack do webapp

- **Roteamento**: TanStack Router (arquivo `routeTree.gen.ts` é gerado — não editar manualmente)
- **Dados**: TanStack Query (`useQuery`, `useMutation`) via funções em `src/lib/api.ts`
- **UI**: Tailwind CSS + shadcn/ui (componentes em `src/components/ui/`)
- **Modais**: estado local com `useState`, dados iniciais via prop `initialData`
