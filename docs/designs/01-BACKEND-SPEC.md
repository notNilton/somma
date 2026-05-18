# 01 - Especificação de Backend e API

O backend do Tallyoh é uma API REST de alta performance desenvolvida em Go 1.24. Ele gerencia o ciclo de vida financeiro (categorias, transações, orçamentos, veículos e analytics) utilizando o princípio de partidas dobradas e garantindo precisão monetária via armazenamento em centavos.

> **Nota:** O sistema foi simplificado. Não há mais endpoints para contas bancárias, cartões, transferências, calendário ou planejamento de metas de longo prazo. Orçamentos são derivados diretamente das transações.

## Stack Tecnológica

- **Linguagem**: Go 1.24
- **Roteamento**: `net/http` (Standard Library)
- **Banco de Dados**: PostgreSQL 18 + `pgx/v5`
- **Autenticação**: JWT (`github.com/golang-jwt/jwt/v5`) com claim `jti` e blocklist `revoked_tokens`
- **Rate Limiting**: `golang.org/x/time/rate` (2 req/s, burst 10) por IP
- **CORS**: Whitelist de origens (defesa em profundidade para dev local)
- **Headers de Segurança**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `HSTS`
- **Migrações**: `golang-migrate` (encapsulado em `database/cmd/migrate`)
- **Jobs**: Scheduler interno (recurring transactions + budget alerts)

## Estrutura Principal

- `apps/backend/cmd/api/main.go`: Ponto de entrada e inicialização do servidor.
- `apps/backend/internal/handlers/`: Handlers HTTP para os domínios de negócio.
- `apps/backend/internal/jobs/`: Scheduler e jobs assíncronos.
- `apps/backend/internal/cache/`: Cache em memória para agregações.
- `apps/backend/internal/db/`: Interação direta com o Postgres via `pgx`.
- `apps/backend/internal/middleware/`: Auth, Logging e CORS.

## Endpoints da API

Todos os endpoints (exceto Login/Register/Health) exigem autenticação via cookie `tallyoh_session` ou header `Authorization: Bearer <token>`.

### Autenticação (`Auth`)
- `POST /api/auth/register`: Criação de nova conta (senha mín. 12 chars). Retorna `{ok:true}` + cookie.
- `POST /api/auth/login`: Autenticação. Retorna `{ok:true}` + cookie `tallyoh_session`.

### Perfil (`Users`)
- `GET /api/users/me`: Dados do usuário logado.
- `PATCH /api/users/me`: Atualização de nome/email.

### Categorias (`Categories`)
- `GET /api/v1/categories`: Lista categorias.
- `GET /api/v1/categories/{id}`: Detalhe de uma categoria.
- `POST /api/v1/categories`: Cria categoria.
- `PATCH /api/v1/categories/{id}`: Atualiza categoria.
- `DELETE /api/v1/categories/{id}`: Remove categoria.

### Tags (`Tags`)
- `GET /api/v1/tags`: Lista tags.
- `GET /api/v1/tags/{id}`: Detalhe de uma tag.
- `POST /api/v1/tags`: Cria tag.
- `PATCH /api/v1/tags/{id}`: Atualiza tag.
- `DELETE /api/v1/tags/{id}`: Remove tag.

### Transações (`Transactions`)
- `GET /api/v1/transactions`: Lista movimentações com filtros e paginação.
- `GET /api/v1/transactions/future`: Lista transações agendadas (futuras).
- `GET /api/v1/transactions/{id}`: Detalhe de uma transação.
- `POST /api/v1/transactions`: Registra nova entrada, saída ou ajuste.
- `PATCH /api/v1/transactions/{id}`: Atualiza transação.
- `DELETE /api/v1/transactions/{id}`: Soft-delete de transação.

### Orçamentos (`Budgets`)
- `GET /api/v1/budgets`: Lista orçamentos com itens e status derivado.
- `POST /api/v1/budgets`: Cria orçamento com itens.
- `PATCH /api/v1/budgets/{id}`: Atualiza orçamento e itens.
- `DELETE /api/v1/budgets/{id}`: Soft-delete de orçamento.

> **Modelo derivado:** os valores de cada `budget_item` são calculados em tempo real a partir das transações vinculadas (`budget_item_id`). Não há campo `amount` fixo nos itens.

### Veículos (`Vehicles`)
- `GET /api/v1/vehicles`: Lista veículos.
- `GET /api/v1/vehicles/{id}`: Detalhe de veículo.
- `POST /api/v1/vehicles`: Cria veículo.
- `PATCH /api/v1/vehicles/{id}`: Atualiza veículo.
- `DELETE /api/v1/vehicles/{id}`: Soft-delete de veículo.
- `GET /api/v1/vehicles/{id}/refuelings`: Transações de abastecimento do veículo.
- `GET /api/v1/vehicles/{id}/maintenances`: Retorna `[]` (tabela removida na simplificação).
- `GET /api/v1/vehicles/{id}/expenses-stats`: Estatísticas de gastos com o veículo.

### Dashboard e Analytics
- `GET /api/v1/dashboard`: Resumo do mês (saldo, receitas, despesas).
- `GET /api/v1/dashboard/monthly-evolution`: Dados para gráfico de evolução mensal.
- `GET /api/v1/dashboard/category-breakdown`: Distribuição de gastos por categoria.
- `GET /api/v1/analytics/annual-evolution`: Evolução anual (receitas vs despesas por mês).

### Configurações (`Settings`)
- `GET /api/v1/settings/profile`: Perfil completo.
- `PATCH /api/v1/settings/profile`: Atualiza perfil.
- `PATCH /api/v1/settings/change-password`: Altera senha.
- `DELETE /api/v1/settings/account`: Deleta conta e todos os dados (exige `currentPassword`).

### Sistema
- `GET /api/health`: Healthcheck básico.

## Regras de Negócio Críticas

1. **Precisão Monetária**: Todos os valores são tratados como `int64` (centavos) para evitar erros de floating point.
2. **Datas**: Transações sem horário específico são salvas como `YYYY-MM-DD 12:00:00 UTC` para consistência.
3. **Orçamentos Derivados**: Cada `budget_item` não tem valor fixo. O orçamentado é a soma de transações do tipo `INCOME` vinculadas ao item; o gasto é a soma de `EXPENSE`.
4. **Soft Delete**: Todas as entidades de domínio usam `is_active` + `deleted_at`.

## Jobs Assíncronos

O scheduler roda em goroutines separadas:
- **Recurring Transactions** (a cada 1h): Promove transações `PENDING` com `is_recurring = true` e `date <= NOW()` para o próximo período.
- **Budget Alerts** (diário às 00:05): Loga alertas quando `spent >= budgeted` para orçamentos ativos.

## Desenvolvimento

- **Executar**: `cd apps/backend && air`
- **Testar**: `go test ./internal/...`
- **Vendor**: `go mod vendor` para builds determinísticos no CI.
