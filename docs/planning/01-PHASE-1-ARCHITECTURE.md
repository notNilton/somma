# 01 — Fase 1: Fundação e Core Financeiro

> **Status: ✅ Concluída** — Monorepo ✅ | Auth ✅ | Core Contábil ✅ | CI/CD ✅

> ⚠️ **Aviso de Simplificação:** O sistema foi intencionalmente enxugado em 2025. Funcionalidades descritas neste documento como `accounts`, `transfers` e `cards` foram removidas nas migrations `000007` e `000011`. Consulte o `00-MASTER-TODO.md` e os `design specs` atualizados para o estado real.

A Fase 1 estabeleceu a fundação arquitetural do **Tallyoh**: um sistema de partidas dobradas (double-entry bookkeeping) de alta precisão, entregue como monorepo com CI/CD automatizado.

---

## 1. Arquitetura Monorepo e Infraestrutura

### Backend & DevOps
- [x] **Monorepo Pattern:** Organização em `apps/backend`, `apps/webapp`, `database/` e `client-api/`. Mudanças de schema refletem imediatamente no backend e são validadas num único commit atômico.
- [x] **Containerização:** `docker-compose.yml` com PostgreSQL 18 + backend Go + webapp Nginx.
- [x] **Módulo Database Isolado:** Binário próprio em `database/cmd/migrate` para evolução de schema via SQL puro com `golang-migrate`. O banco é um domínio operacional de primeira classe — nunca gerenciado pelo ORM.
- [x] **Dependências Vendorizadas:** `apps/backend/vendor/` e `database/vendor/` garantem builds determinísticos no CI sem acesso à internet.

### CI/CD (Gitea Actions)
- [x] **`ondev.yml`** — Valida `go build`, `npm run build` e `docker compose config` em todo push para `development`. Zero publicação de imagens.
- [x] **`onmain.yml`** — Incrementa versão (patch) automaticamente em `VERSION` e `package.json`, compila binários Go, builda imagens Docker e publica no registry interno do Gitea.
- [x] **Registry Interno:** Imagens publicadas em `gitea.nilbyte.com.br` com suporte a insecure registry no CI via rede Docker `nilbyte-git`.

---

## 2. Core Contábil (Double-Entry)

### Backend
- [x] **Precisão Monetária:** Todos os valores monetários armazenados como `BIGINT` (centavos) no PostgreSQL. Sem floating point em qualquer camada.
- [x] **Tabela `accounts`:** Contas bancárias, poupanças e carteiras com `balance_cents` atualizado atomicamente a cada transação.
- [x] **Tabela `transactions`:** Receitas, despesas e ajustes com suporte a `category_id`, `tag_id` e data normalizada (`YYYY-MM-DD 12:00:00 UTC`) para consistência em visualizações de calendário.
- [x] **Tabela `transfers`:** Transferência entre contas gerando dois lançamentos vinculados (`source_transaction_id` / `dest_transaction_id`) com integridade referencial garantida.
- [x] **Tabela `categories` e `tags`:** Classificação hierárquica e etiquetas transversais por usuário.

### Schema Inicial (Migration 000001)
```sql
users, accounts, categories, tags, transactions, transfers
```

---

## 3. Autenticação e Segurança

- [x] **JWT (`golang-jwt/jwt/v5`):** Tokens com expiração, validados via middleware `internal/middleware/Auth`.
- [x] **Bcrypt:** Senhas nunca armazenadas em texto plano.
- [x] **CORS:** Middleware configurado para isolar `WEBAPP_URL`.
- [x] **Rotas protegidas:** Todos os endpoints de negócio exigem `Authorization: Bearer <token>` (exceto `/auth/login` e `/auth/register`).

---

## 4. Dashboard e Consultas Analíticas

- [x] **`GET /api/v1/dashboard`:** Saldo total, receitas e despesas do mês atual.
- [x] **`GET /api/v1/dashboard/monthly-evolution`:** Série histórica de receitas vs despesas por mês.
- [x] **`GET /api/v1/dashboard/category-breakdown`:** Distribuição percentual de gastos por categoria no período.
- [x] **Cache em memória (`internal/cache`):** TTL configurável para resultados de queries analíticas pesadas, evitando recalcular a cada requisição.

---

## 5. Webapp — Estrutura Base

- [x] **TanStack Router:** Roteamento type-safe baseado em arquivo (`src/routes/`).
- [x] **TanStack Query:** Gerenciamento de server-state com cache, refetch e invalidação automática.
- [x] **Zustand:** Estado global para autenticação (`auth store`) e preferências de UI (`privacy store`).
- [x] **Tailwind CSS v4:** Design system utilitário com `@tailwindcss/vite`.
- [x] **Rotas implementadas:** `/auth`, `/` (dashboard), `/activity/transactions`, `/wallet/accounts`.

---

## Estratégia de Validação

- [x] **Testes unitários de handlers:** `accounts_test.go`, `auth_test.go`, `cards_test.go`, `categories_test.go`, `dashboard_test.go`, `settings_test.go`, `tags_test.go`, `transactions_test.go`, `vehicles_test.go`.
- [x] **Coleção Bruno (`client-api/`):** Documentação viva dos endpoints. Fluxo `Register → Login → POST /api/v1/transactions` validado manualmente.
- [x] **`GET /health`:** Endpoint de healthcheck para monitoramento de uptime.
