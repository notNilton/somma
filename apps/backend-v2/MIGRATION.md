# Projeto de Migração: NestJS → Go (backend-v2)

Este documento é o guia completo para uma LLM migrar o backend NestJS para Go.
Siga a ordem dos módulos. Cada módulo é independente e pode ser implementado separadamente.

---

## Stack de tecnologias

| NestJS (origem)      | Go (destino)                               |
| -------------------- | ------------------------------------------ |
| NestJS framework     | `net/http` stdlib (Go 1.22+)               |
| Prisma ORM           | `pgx/v5` direto com SQL explícito          |
| class-validator DTOs | validação manual com `if` + erros          |
| JWT (NestJS)         | `golang-jwt/jwt v5`                        |
| bcrypt (JS)          | `golang.org/x/crypto/bcrypt`               |
| `@CurrentUser()`     | middleware que injeta user via `r.Context` |
| PartialType DTOs     | campos opcionais com ponteiros `*string`   |
| Soft delete (Prisma) | SQL: `WHERE is_active = true`              |
| Decimal (Prisma)     | `int64` em centavos (R$ 10,50 = 1050)      |
| CSV import           | `encoding/csv` stdlib                      |
| dotenv               | `os.Getenv` stdlib (setar antes de rodar)  |

**Dependências externas do go.mod (apenas 3):**

```
github.com/golang-jwt/jwt/v5
github.com/jackc/pgx/v5
golang.org/x/crypto
```

---

## Estrutura de pastas

```
internal/
├── config/         ← os.Getenv, sem dotenv
├── database/       ← pgxpool.Pool
├── handlers/       ← um arquivo por módulo, assinatura net/http
├── middleware/     ← auth JWT via r.Context
├── models/         ← structs Go (sem GORM tags)
├── routes/         ← http.ServeMux, Go 1.22 pattern routing
└── services/       ← lógica de negócio separada dos handlers
```

---

## Padrões de código obrigatórios

### Handler

```go
func (h *Handler) ListAccounts(w http.ResponseWriter, r *http.Request) {
    user := middleware.UserFromContext(r.Context())

    rows, err := h.db.Query(r.Context(), `
        SELECT id, name, type, balance_cents
        FROM accounts
        WHERE user_id = $1 AND is_active = true
    `, user.ID)
    if err != nil {
        writeError(w, http.StatusInternalServerError, "internal error")
        return
    }
    defer rows.Close()
    // ...
    writeJSON(w, http.StatusOK, accounts)
}
```

### Validação manual (sem biblioteca)

```go
type CreateAccountDto struct {
    Name  string `json:"name"`
    Type  string `json:"type"`
}

func (d *CreateAccountDto) Validate() error {
    if d.Name == "" {
        return errors.New("name is required")
    }
    if len(d.Name) > 100 {
        return errors.New("name max 100 chars")
    }
    validTypes := map[string]bool{"CHECKING": true, "SAVINGS": true, "CASH": true, "WALLET": true, "INVESTMENT": true}
    if !validTypes[d.Type] {
        return errors.New("invalid account type")
    }
    return nil
}

// No handler:
var dto CreateAccountDto
if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
    writeError(w, http.StatusBadRequest, "invalid json")
    return
}
if err := dto.Validate(); err != nil {
    writeError(w, http.StatusBadRequest, err.Error())
    return
}
```

### Valores monetários em centavos (int64)

```go
// Banco armazena INTEGER (centavos)
// API recebe/envia float em reais, converte internamente

func toCents(reais float64) int64 {
    return int64(math.Round(reais * 100))
}

func toReais(cents int64) float64 {
    return float64(cents) / 100.0
}

// DTO recebe float:
type CreateTransactionDto struct {
    Amount float64 `json:"amount"` // ex: 10.50
}

// No service, converte antes de salvar:
amountCents := toCents(dto.Amount) // 1050

// Na query:
_, err = h.db.Exec(r.Context(), `
    INSERT INTO transactions (amount_cents, ...) VALUES ($1, ...)
`, amountCents)

// Na resposta, converte de volta:
json: { "amount": toReais(row.AmountCents) }
```

### Roteamento net/http Go 1.22

```go
// Go 1.22+: método + path pattern nativos
mux.HandleFunc("GET /api/v1/accounts",     middleware.Auth(h.ListAccounts))
mux.HandleFunc("GET /api/v1/accounts/{id}", middleware.Auth(h.GetAccount))
mux.HandleFunc("POST /api/v1/accounts",    middleware.Auth(h.CreateAccount))
mux.HandleFunc("PATCH /api/v1/accounts/{id}", middleware.Auth(h.UpdateAccount))
mux.HandleFunc("DELETE /api/v1/accounts/{id}", middleware.Auth(h.DeleteAccount))

// Extrair path param:
id := r.PathValue("id")
```

### Middleware Auth

```go
type contextKey string
const userKey contextKey = "user"

func Auth(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        header := r.Header.Get("Authorization")
        if !strings.HasPrefix(header, "Bearer ") {
            writeError(w, http.StatusUnauthorized, "missing token")
            return
        }
        tokenStr := strings.TrimPrefix(header, "Bearer ")
        // validar JWT, buscar user no banco
        // ...
        ctx := context.WithValue(r.Context(), userKey, user)
        next(w, r.WithContext(ctx))
    }
}

func UserFromContext(ctx context.Context) *models.User {
    return ctx.Value(userKey).(*models.User)
}
```

---

## Regras de negócio críticas

1. **Soft delete** — Account, Card, Vehicle, Transaction nunca são deletados fisicamente.
   Sempre `UPDATE SET is_active = false, deleted_at = NOW()`. Filtrar `WHERE is_active = true`.

2. **Datas em UTC 12:00** — Salvar como `date::timestamptz` com horário `12:00:00+00`.

3. **affectsAccount** — Transações de cartão de crédito: `affects_account = false`.

4. **Sem CREDIT_CARD como AccountType** — Tipos válidos:
   `CHECKING | SAVINGS | CASH | WALLET | INVESTMENT`

5. **Titularidade** — `PERSONAL` usa `cpf`, `BUSINESS` usa `cnpj`.

---

## Módulo 0 — Models (fazer primeiro)

Criar `internal/models/`. São structs simples, sem GORM tags — usadas apenas para
deserializar resultados das queries pgx.

### internal/models/enums.go

```go
const (
    AccountTypeCHECKING   = "CHECKING"
    AccountTypeSAVINGS    = "SAVINGS"
    AccountTypeCASH       = "CASH"
    AccountTypeWALLET     = "WALLET"
    AccountTypeINVESTMENT = "INVESTMENT"

    CardTypeCREDIT = "CREDIT"
    CardTypeDEBIT  = "DEBIT"

    TransactionTypeINCOME     = "INCOME"
    TransactionTypeEXPENSE    = "EXPENSE"
    TransactionTypeTRANSFER   = "TRANSFER"
    TransactionTypeADJUSTMENT = "ADJUSTMENT"

    TransactionStatusPENDING   = "PENDING"
    TransactionStatusCOMPLETED = "COMPLETED"
    TransactionStatusCANCELED  = "CANCELED"

    PaymentMethodDEBIT  = "DEBIT"
    PaymentMethodCREDIT = "CREDIT"

    FuelTypeGASOLINA_COMUM     = "GASOLINA_COMUM"
    FuelTypeGASOLINA_ADITIVADA = "GASOLINA_ADITIVADA"
    FuelTypeETANOL             = "ETANOL"
    FuelTypeDIESEL             = "DIESEL"
    FuelTypeGNV                = "GNV"
)
```

### internal/models/user.go

```go
type User struct {
    ID                 string
    Email              string
    PasswordHash       string
    Name               *string
    Phone              *string
    Cpf                *string
    Cnpj               *string
    AvatarUrl          *string
    PrivacyModeEnabled bool
    CreatedAt          time.Time
    UpdatedAt          time.Time
}
```

### internal/models/account.go

```go
type Account struct {
    ID             string
    UserID         string
    Name           string
    Type           string
    Ownership      string
    BankName       *string
    Cpf            *string
    Cnpj           *string
    Color          *string
    Icon           *string
    CurrencyCode   string
    BalanceCents   int64   // centavos
    CreditLimitCents *int64 // centavos, nullable
    HasDebit       bool
    HasPix         bool
    HasCredit      bool
    IncludeInTotal bool
    ClosingDay     *int
    DueDay         *int
    IsActive       bool
    DeletedAt      *time.Time
}
```

### internal/models/transaction.go

```go
type Transaction struct {
    ID                   string
    AccountID            string
    UserID               string
    CategoryID           *string
    CardID               *string
    Type                 string
    Classification       string
    PaymentMethod        string
    Channel              string
    Status               string
    IsRecurring          bool
    AmountCents          int64   // centavos
    TotalInstallments    *int
    PaidInstallments     *int
    Date                 time.Time
    Description          string
    Notes                *string
    CurrencyCode         string
    AffectsAccount       bool
    IsActive             bool
    DeletedAt            *time.Time
    CreatedAt            time.Time
    UpdatedAt            time.Time
}
```

Criar modelos análogos para: `Card`, `Category`, `Tag`, `Vehicle`,
`RefuelingLog`, `VehicleMaintenance`.

---

## Módulo 1 — Auth

**Arquivos:** `internal/handlers/auth.go` + `internal/middleware/auth.go`

### Endpoints

| Método | Rota             | Body        | Resposta          |
| ------ | ---------------- | ----------- | ----------------- |
| POST   | `/auth/register` | RegisterDto | `{ accessToken }` |
| POST   | `/auth/login`    | LoginDto    | `{ accessToken }` |

### DTOs

```go
type RegisterDto struct {
    Email    string  `json:"email"`
    Password string  `json:"password"`
    Name     *string `json:"name"`
    Phone    *string `json:"phone"`
    Cpf      *string `json:"cpf"`
    Cnpj     *string `json:"cnpj"`
}

func (d *RegisterDto) Validate() error {
    if d.Email == "" || !strings.Contains(d.Email, "@") {
        return errors.New("valid email required")
    }
    if len(d.Password) < 6 {
        return errors.New("password min 6 chars")
    }
    return nil
}

type LoginDto struct {
    Email    string `json:"email"`
    Password string `json:"password"`
}
```

### Lógica

- **Register:** hash bcrypt 10 rounds → INSERT user → gerar JWT → retornar token
- **Login:** SELECT user por email → bcrypt.CompareHashAndPassword → gerar JWT
- **JWT:** payload `{ sub: userID, email }`, secret via `cfg.JWTSecret`, expiração 7 dias
- **Erro de email duplicado:** verificar `pgconn.PgError` code `23505` → 409 Conflict

---

## Módulo 2 — Users

| Método | Rota        | Auth | Descrição          |
| ------ | ----------- | ---- | ------------------ |
| GET    | `/users/me` | ✅   | Retorna user atual |
| PATCH  | `/users/me` | ✅   | Atualiza perfil    |

### UpdateUserDto

```go
type UpdateUserDto struct {
    Email              *string `json:"email"`
    Name               *string `json:"name"`
    AvatarUrl          *string `json:"avatarUrl"`
    PrivacyModeEnabled *bool   `json:"privacyModeEnabled"`
}

func (d *UpdateUserDto) Validate() error {
    if d.Email != nil && !strings.Contains(*d.Email, "@") {
        return errors.New("invalid email")
    }
    return nil
}
```

---

## Módulo 3 — Accounts

| Método | Rota                              | Auth | Descrição            |
| ------ | --------------------------------- | ---- | -------------------- |
| GET    | `/api/v1/accounts`                | ✅   | Listar contas ativas |
| GET    | `/api/v1/accounts/credit-summary` | ✅   | Resumo de crédito    |
| GET    | `/api/v1/accounts/{id}`           | ✅   | Detalhe              |
| POST   | `/api/v1/accounts`                | ✅   | Criar                |
| PATCH  | `/api/v1/accounts/{id}`           | ✅   | Atualizar            |
| DELETE | `/api/v1/accounts/{id}`           | ✅   | Soft delete          |

### CreateAccountDto

```go
type CreateAccountDto struct {
    Name           string   `json:"name"`
    Type           string   `json:"type"`
    Ownership      *string  `json:"ownership"`
    BankName       *string  `json:"bankName"`
    Cpf            *string  `json:"cpf"`
    Cnpj           *string  `json:"cnpj"`
    Color          *string  `json:"color"`
    Icon           *string  `json:"icon"`
    CurrencyCode   *string  `json:"currencyCode"`
    Balance        *float64 `json:"balance"`        // converte para centavos
    CreditLimit    *float64 `json:"creditLimit"`    // converte para centavos
    HasDebit       *bool    `json:"hasDebit"`
    HasPix         *bool    `json:"hasPix"`
    HasCredit      *bool    `json:"hasCredit"`
    IncludeInTotal *bool    `json:"includeInTotal"`
    ClosingDay     *int     `json:"closingDay"`
    DueDay         *int     `json:"dueDay"`
}

func (d *CreateAccountDto) Validate() error {
    if d.Name == "" { return errors.New("name is required") }
    if len(d.Name) > 100 { return errors.New("name max 100 chars") }
    valid := map[string]bool{"CHECKING": true, "SAVINGS": true, "CASH": true, "WALLET": true, "INVESTMENT": true}
    if !valid[d.Type] { return errors.New("invalid account type") }
    if d.CreditLimit != nil && *d.CreditLimit < 0 { return errors.New("creditLimit must be >= 0") }
    if d.ClosingDay != nil && (*d.ClosingDay < 1 || *d.ClosingDay > 28) { return errors.New("closingDay 1-28") }
    if d.DueDay != nil && (*d.DueDay < 1 || *d.DueDay > 28) { return errors.New("dueDay 1-28") }
    return nil
}
```

### credit-summary — query SQL

```sql
SELECT
    a.id,
    a.name,
    a.credit_limit_cents,
    COALESCE(SUM(t.amount_cents), 0) AS used_cents
FROM accounts a
LEFT JOIN transactions t ON
    t.account_id = a.id
    AND t.affects_account = false
    AND t.is_active = true
    AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', NOW())
WHERE a.user_id = $1
  AND a.credit_limit_cents IS NOT NULL
  AND a.is_active = true
GROUP BY a.id, a.name, a.credit_limit_cents
```

---

## Módulo 4 — Cards

| Método | Rota                 | Auth | Descrição   |
| ------ | -------------------- | ---- | ----------- |
| GET    | `/api/v1/cards`      | ✅   | Listar      |
| GET    | `/api/v1/cards/{id}` | ✅   | Detalhe     |
| POST   | `/api/v1/cards`      | ✅   | Criar       |
| PATCH  | `/api/v1/cards/{id}` | ✅   | Atualizar   |
| DELETE | `/api/v1/cards/{id}` | ✅   | Soft delete |

### CreateCardDto

```go
type CreateCardDto struct {
    AccountId   string   `json:"accountId"`
    Name        string   `json:"name"`
    Brand       *string  `json:"brand"`
    Last4       *string  `json:"last4"`
    Type        string   `json:"type"`         // CREDIT | DEBIT
    CreditLimit *float64 `json:"creditLimit"`  // converte para centavos
    Color       *string  `json:"color"`
    Icon        *string  `json:"icon"`
    ClosingDay  *int     `json:"closingDay"`
    DueDay      *int     `json:"dueDay"`
}

func (d *CreateCardDto) Validate() error {
    if d.AccountId == "" { return errors.New("accountId required") }
    if d.Name == "" { return errors.New("name required") }
    if d.Type != "CREDIT" && d.Type != "DEBIT" { return errors.New("type must be CREDIT or DEBIT") }
    if d.Last4 != nil && len(*d.Last4) > 4 { return errors.New("last4 max 4 chars") }
    return nil
}
```

---

## Módulo 5 — Categories

| Método | Rota                      | Auth | Descrição                |
| ------ | ------------------------- | ---- | ------------------------ |
| GET    | `/api/v1/categories`      | ✅   | Listar com subcategorias |
| GET    | `/api/v1/categories/{id}` | ✅   | Detalhe                  |
| POST   | `/api/v1/categories`      | ✅   | Criar                    |
| PATCH  | `/api/v1/categories/{id}` | ✅   | Atualizar                |
| DELETE | `/api/v1/categories/{id}` | ✅   | Hard delete              |

### Lógica — retornar árvore

```go
type CategoryWithChildren struct {
    models.Category
    Children []models.Category `json:"children"`
}

// 1. SELECT WHERE parent_id IS NULL AND user_id = $1
// 2. SELECT WHERE parent_id IS NOT NULL AND user_id = $1
// 3. Montar árvore em Go agrupando por parent_id
```

---

## Módulo 6 — Tags

| Método | Rota                | Auth | Descrição |
| ------ | ------------------- | ---- | --------- |
| GET    | `/api/v1/tags`      | ✅   | Listar    |
| GET    | `/api/v1/tags/{id}` | ✅   | Detalhe   |
| POST   | `/api/v1/tags`      | ✅   | Criar     |
| PATCH  | `/api/v1/tags/{id}` | ✅   | Atualizar |
| DELETE | `/api/v1/tags/{id}` | ✅   | Deletar   |

---

## Módulo 7 — Transactions

| Método | Rota                              | Auth | Descrição           |
| ------ | --------------------------------- | ---- | ------------------- |
| GET    | `/api/v1/transactions`            | ✅   | Listar com filtros  |
| GET    | `/api/v1/transactions/future`     | ✅   | Futuras/recorrentes |
| GET    | `/api/v1/transactions/{id}`       | ✅   | Detalhe             |
| POST   | `/api/v1/transactions`            | ✅   | Criar               |
| POST   | `/api/v1/transactions/import-csv` | ✅   | Importar CSV        |
| PATCH  | `/api/v1/transactions/{id}`       | ✅   | Atualizar           |
| DELETE | `/api/v1/transactions/{id}`       | ✅   | Soft delete         |

### Query params

```go
type ListTransactionsQuery struct {
    AccountId      string // r.URL.Query().Get("accountId")
    CategoryId     string
    Search         string
    Type           string
    Classification string
    Status         string
    From           string
    To             string
    Page           int    // default 1
    Limit          int    // default 20
}
```

### CreateTransactionDto

```go
type CreateTransactionDto struct {
    AccountId         string   `json:"accountId"`
    CategoryId        *string  `json:"categoryId"`
    Type              string   `json:"type"`
    Classification    *string  `json:"classification"`
    PaymentMethod     *string  `json:"paymentMethod"`
    Channel           *string  `json:"channel"`
    CardId            *string  `json:"cardId"`
    Status            *string  `json:"status"`
    IsRecurring       *bool    `json:"isRecurring"`
    Amount            float64  `json:"amount"`      // converte para centavos
    TotalInstallments *int     `json:"totalInstallments"`
    PaidInstallments  *int     `json:"paidInstallments"`
    Date              string   `json:"date"`
    Description       string   `json:"description"`
    Notes             *string  `json:"notes"`
    CurrencyCode      *string  `json:"currencyCode"`
    // Combustível
    VehicleId         *string  `json:"vehicleId"`
    Station           *string  `json:"station"`
    FuelType          *string  `json:"fuelType"`
    CurrentKm         *float64 `json:"currentKm"`
    Liters            *float64 `json:"liters"`
    PricePerLiter     *float64 `json:"pricePerLiter"` // centavos
    // Manutenção
    MaintenanceType   *string  `json:"maintenanceType"`
    Provider          *string  `json:"provider"`
}

func (d *CreateTransactionDto) Validate() error {
    if d.AccountId == "" { return errors.New("accountId required") }
    if d.Amount <= 0 { return errors.New("amount must be > 0") }
    if d.Description == "" { return errors.New("description required") }
    if len(d.Description) > 255 { return errors.New("description max 255 chars") }
    if d.Date == "" { return errors.New("date required") }
    validTypes := map[string]bool{"INCOME": true, "EXPENSE": true, "TRANSFER": true, "ADJUSTMENT": true}
    if !validTypes[d.Type] { return errors.New("invalid transaction type") }
    if d.TotalInstallments != nil && (*d.TotalInstallments < 1 || *d.TotalInstallments > 21) {
        return errors.New("totalInstallments 1-21")
    }
    return nil
}
```

### Importação CSV

```go
// multipart/form-data com campo "file"
file, _, err := r.FormFile("file")
reader := csv.NewReader(file)
records, _ := reader.ReadAll()

// Para cada linha:
// 1. Gerar SHA256: hash = sha256.Sum256([]byte(strings.Join(record, ",")))
// 2. Verificar INSERT INTO import_fingerprints (hash) ON CONFLICT DO NOTHING
// 3. Se rows affected == 0: skippedDuplicate++, continue
// 4. Senão: parsear linha, criar transaction
```

---

## Módulo 8 — Vehicles

| Método | Rota                                   | Auth | Descrição                       |
| ------ | -------------------------------------- | ---- | ------------------------------- |
| GET    | `/api/v1/vehicles`                     | ✅   | Listar                          |
| GET    | `/api/v1/vehicles/{id}`                | ✅   | Detalhe                         |
| GET    | `/api/v1/vehicles/{id}/refuelings`     | ✅   | Logs de abastecimento           |
| GET    | `/api/v1/vehicles/{id}/maintenances`   | ✅   | Logs de manutenção              |
| GET    | `/api/v1/vehicles/{id}/stats`          | ✅   | Estatísticas                    |
| GET    | `/api/v1/vehicles/{id}/expenses-stats` | ✅   | Totais combustível + manutenção |
| POST   | `/api/v1/vehicles`                     | ✅   | Criar                           |
| PATCH  | `/api/v1/vehicles/{id}`                | ✅   | Atualizar                       |
| DELETE | `/api/v1/vehicles/{id}`                | ✅   | Soft delete                     |

### expenses-stats — query SQL

```sql
SELECT
    COALESCE(SUM(CASE WHEN t.classification = 'FUEL' THEN t.amount_cents ELSE 0 END), 0)        AS fuel_cents,
    COALESCE(SUM(CASE WHEN t.classification = 'MAINTENANCE' THEN t.amount_cents ELSE 0 END), 0) AS maintenance_cents
FROM transactions t
WHERE t.account_id IN (SELECT account_id FROM vehicles WHERE id = $1)
  AND t.is_active = true
```

### Response (converter centavos para reais)

```json
{ "totalFuel": 150.0, "totalMaintenance": 320.5, "total": 470.5 }
```

---

## Módulo 9 — Dashboard

| Método | Rota                | Auth | Descrição          |
| ------ | ------------------- | ---- | ------------------ |
| GET    | `/api/v1/dashboard` | ✅   | Resumo consolidado |

### Queries necessárias

```sql
-- total balance
SELECT COALESCE(SUM(balance_cents), 0) FROM accounts
WHERE user_id = $1 AND is_active = true AND include_in_total = true

-- income/expenses do mês
SELECT type, COALESCE(SUM(amount_cents), 0)
FROM transactions
WHERE user_id = $1 AND is_active = true
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())
  AND type IN ('INCOME', 'EXPENSE')
GROUP BY type

-- cash flow últimos 7 dias
SELECT DATE(date) AS day, SUM(amount_cents) AS total
FROM transactions
WHERE user_id = $1 AND is_active = true AND date >= NOW() - INTERVAL '7 days'
GROUP BY DATE(date)
ORDER BY day

-- últimas 5 transações
SELECT t.*, c.name AS category_name, c.color AS category_color
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id
WHERE t.user_id = $1 AND t.is_active = true
ORDER BY t.date DESC LIMIT 5
```

---

## Módulo 10 — Settings

| Método | Rota                               | Auth | Status | Descrição        |
| ------ | ---------------------------------- | ---- | ------ | ---------------- |
| GET    | `/api/v1/settings/profile`         | ✅   | 200    | Perfil           |
| PATCH  | `/api/v1/settings/profile`         | ✅   | 200    | Atualizar perfil |
| PATCH  | `/api/v1/settings/change-password` | ✅   | 204    | Trocar senha     |
| DELETE | `/api/v1/settings/account`         | ✅   | 204    | Deletar conta    |

### ChangePasswordDto

```go
type ChangePasswordDto struct {
    CurrentPassword string `json:"currentPassword"`
    NewPassword     string `json:"newPassword"`
}

func (d *ChangePasswordDto) Validate() error {
    if d.CurrentPassword == "" { return errors.New("currentPassword required") }
    if len(d.NewPassword) < 6 { return errors.New("newPassword min 6 chars") }
    return nil
}
```

### Lógica change-password

```go
if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(dto.CurrentPassword)); err != nil {
    writeError(w, http.StatusBadRequest, "incorrect current password")
    return
}
hash, _ := bcrypt.GenerateFromPassword([]byte(dto.NewPassword), 10)
// UPDATE users SET password_hash = $1 WHERE id = $2
w.WriteHeader(http.StatusNoContent)
```

---

## Ordem de implementação

1. `models/enums.go` + todos os models
2. `middleware/auth.go` (JWT middleware + UserFromContext)
3. `handlers/auth.go` (register + login)
4. `handlers/users.go`
5. `handlers/accounts.go`
6. `handlers/cards.go`
7. `handlers/categories.go`
8. `handlers/tags.go`
9. `handlers/transactions.go`
10. `handlers/vehicles.go`
11. `handlers/dashboard.go`
12. `handlers/settings.go`
13. Registrar tudo em `routes/routes.go`

---

## Variáveis de ambiente (.env)

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5454/project_budget?schema=public
JWT_SECRET=sua_chave_secreta_aqui
ENV=development
```

Setar antes de rodar em desenvolvimento:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5454/project_budget?schema=public"
$env:JWT_SECRET="dev-secret"
go run ./cmd/api
```
