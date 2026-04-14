# 01 - Especificação de Backend e API

O backend do Mirante é uma API REST de alta performance desenvolvida em Go 1.24. Ele gerencia o ciclo de vida financeiro (contas, transações, orçamentos e planejamento) utilizando o princípio de partidas dobradas e garantindo precisão monetária via armazenamento em centavos.

## Stack Tecnológica

- **Linguagem**: Go 1.24
- **Roteamento**: `net/http` (Standard Library)
- **Banco de Dados**: PostgreSQL 18 + `pgx/v5`
- **Autenticação**: JWT (`github.com/golang-jwt/jwt/v5`)
- **Migrações**: `golang-migrate` (encapsulado em `database/cmd/migrate`)

## Estrutura Principal

- `apps/backend/cmd/api/main.go`: Ponto de entrada e inicialização do servidor.
- `apps/backend/internal/handlers/`: Handlers HTTP para os domínios de negócio.
- `apps/backend/internal/services/`: Lógica de domínio (ex: cálculo de saldo, validação de orçamentos).
- `apps/backend/internal/db/`: Interação direta com o Postgres via `pgx`.
- `apps/backend/internal/middleware/`: Auth, Logging e CORS.

## Endpoints da API

Todos os endpoints (exceto Login/Register/Health) exigem o header `Authorization: Bearer <token>`.

### Autenticação (`Auth`)
- `POST /api/register`: Criação de nova conta.
- `POST /api/login`: Autenticação e recebimento de JWT.

### Contas e Carteiras (`Accounts`)
- `GET /api/accounts`: Lista todas as contas (corrente, poupança, etc).
- `POST /api/accounts`: Cria uma nova conta.
- `GET /api/accounts/:id/summary`: Resumo de crédito e saldo.
- `DELETE /api/accounts/:id`: Remove (soft-delete) uma conta.

### Transações (`Transactions`)
- `GET /api/transactions`: Lista movimentações com filtros e paginação.
- `POST /api/transactions`: Registra nova entrada, saída ou ajuste.
- `POST /api/transfers`: Cria uma transferência entre duas contas (gera 2 transações vinculadas).
- `POST /api/transactions/import`: Importação de extratos (CSV/OFX).

### Planejamento e Orçamentos (`Planning & Budgets`)
- `GET /api/budgets/status`: Comparativo real vs planejado do mês.
- `POST /api/budgets`: Define orçamento para uma categoria.
- `GET /api/planning/plans`: Lista planos de metas e sonhos.
- `POST /api/planning/contributions`: Registra aporte em uma meta.

### Veículos e Frotas (`Vehicles`)
- `GET /api/vehicles`: Lista veículos cadastrados.
- `POST /api/vehicles/refuel`: Registra abastecimento (gera transação financeira).
- `GET /api/vehicles/:id/stats`: Estatísticas de autonomia e custo/km.

### Dashboard e Relatórios
- `GET /api/dashboard/monthly-evolution`: Dados para gráfico de evolução mensal.
- `GET /api/dashboard/category-breakdown`: Distribuição de gastos por categoria.
- `GET /api/calendar`: Visão de calendário de vencimentos e recebimentos.

## Regras de Negócio Críticas

1. **Precisão Monetária**: Todos os valores são tratados como `int64` (centavos) para evitar erros de floating point.
2. **Datas**: Transações sem horário específico são salvas como `YYYY-MM-DD 12:00:00 UTC` para consistência em visualizações de calendário.
3. **Double-Entry**: Cada transação deve afetar o `balance_cents` da conta vinculada de forma atômica.

## Desenvolvimento

- **Executar**: `cd apps/backend && air`
- **Testar**: `go test ./internal/...`
- **Vendor**: `go mod vendor` para garantir builds determinísticos no CI.
