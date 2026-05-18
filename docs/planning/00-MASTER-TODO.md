# Tallyoh — Master TODO

Plataforma de gestão financeira pessoal baseada em partidas dobradas. Controle de transações, categorias, orçamentos, frota pessoal e análise evolutiva de gastos.

> **Nota arquitetural (2025-05):** O sistema foi intencionalmente simplificado. Funcionalidades legadas como contas bancárias, cartões de crédito, transferências, planejamento de metas de longo prazo e colaboração em contas foram removidas para manter o core enxuto e manutenível. O modelo atual deriva orçamentos diretamente das transações vinculadas.

---

## Fase 1 — Fundação e Core Financeiro ✅

### Backend (Go)
- [x] Monorepo (`apps/backend`, `apps/webapp`, `database`, `client-api`)
- [x] Auth JWT com bcrypt
- [x] Categorias e Tags (CRUD)
- [x] Transações com precisão em centavos (`BIGINT`)
- [x] Dashboard (evolução mensal + breakdown por categoria)
- [x] Cache em memória (`internal/cache`)
- [x] Migrations via `golang-migrate` (schema SQL puro)
- [x] Logging estruturado e healthcheck
- [x] Jobs assíncronos (scheduler de recorrências + budget alerts)

### Webapp (React + TanStack)
- [x] Autenticação (Login / Registro)
- [x] Dashboard principal com gráficos
- [x] Extrato de transações com filtros
- [x] Gestão de categorias e tags (Settings)

### DevOps
- [x] Docker Compose local (PostgreSQL + backend + webapp)
- [x] CI via Gitea Actions (`pull_request.yml` + `onmain.yml`)
- [x] Build multi-stage Go e Nginx
- [x] Bump automático de versão no merge para `main`

---

## Fase 2 — Expansão de Módulos ✅

### Backend
- [x] Módulo de Veículos (CRUD + abastecimentos + stats)
- [x] Orçamentos derivados de transações (CRUD + status real vs planejado)
- [x] Vínculo de transações com orçamentos (`budget_id` + `budget_item_id`)
- [x] Listagem de transações futuras
- [x] Analytics anual (`/api/v1/analytics/annual-evolution`)

### Webapp
- [x] Módulo `/budgets` (orçamentos derivados)
- [x] Módulo `/settings` (perfil, categorias, privacidade, veículos)
- [x] Módulo `/transactions/crud-transactions`
- [x] Privacy Mode (blur em valores financeiros)

### Funcionalidades removidas (simplificação intencional)
> As funcionalidades abaixo existiram em versões anteriores mas foram removidas via migrations para manter o sistema enxuto:
- ~~Contas bancárias (`accounts`)~~ — removido na `000011`
- ~~Cartões de crédito (`cards`)~~ — removido na `000011`
- ~~Transferências entre contas (`transfers`)~~ — removido na `000011`
- ~~Colaboração em contas (`account_access`)~~ — removido na `000011`
- ~~Planejamento de metas (`planning_plans`, `items`, `contributions`)~~ — removido na `000007`
- ~~Manutenções de veículos (`vehicle_maintenances`)~~ — removido na `000007`
- ~~Importação / exportação CSV~~ — não implementado
- ~~Calendário financeiro~~ — não implementado

---

## Fase 3 — Qualidade e Confiabilidade (Atual)

### Backend
- [ ] Testes de integração com banco real (`pgx` + banco de teste isolado)
- [ ] Validação de entrada centralizada (middleware ou helper)
- [ ] Rate limiting por usuário nos endpoints de escrita
- [ ] Endpoint `GET /api/v1/transactions/future` com suporte a recorrência avançada

### Webapp
- [ ] Testes E2E com Playwright (fluxo Login → Transação → Dashboard)
- [ ] Cobertura de testes unitários nos hooks de domínio
- [ ] Modo offline básico (PWA / Service Worker para leitura em cache)

### Infraestrutura
- [ ] Health check detalhado com status do banco de dados
- [ ] Métricas de uso (tempo de resposta por endpoint via log aggregation)

---

## Fase 4 — Inteligência Operacional

### Backend
- [ ] Detecção de recorrência em transações (salário, aluguel, assinaturas)
- [ ] Sugestão automática de categoria por descrição/histórico
- [ ] Projeção de saldo futuro baseada em recorrências detectadas
- [ ] API de tendências: variação mês a mês por categoria

### Webapp
- [ ] Painel de insights automáticos no Dashboard
- [ ] Alertas visuais: orçamento próximo do limite (ex: >80%)
- [ ] Gráfico de projeção de saldo nos próximos 30 dias
- [ ] Sugestão de categoria ao criar transação (baseada em histórico)

---

## Fase 5 — Conectividade e Integração

### Backend
- [ ] Importação de extratos no formato OFX/QFX (Open Finance)
- [ ] `idempotency_keys` para importações sem duplicação
- [ ] `audit_logs` — rastreio de alterações em transações (quem, quando, antes/depois)
- [ ] `outbox_events` para webhooks confiáveis (ex: "orçamento estourado → notifica")
- [ ] Webhook de saída configurável por usuário

### Webapp
- [ ] Interface de importação OFX com preview e confirmação
- [ ] Histórico de importações (arquivo, data, quantidade de registros)
- [ ] Painel de auditoria de alterações em transações

---

## Fase 6 — Multi-Tenant e Colaboração Familiar

### Backend
- [ ] Tabela `tenants` (Família, Empresa, Pessoal)
- [ ] Tabela `tenant_users` com roles (OWNER, ADMIN, MEMBER, VIEWER)
- [ ] Row Level Security (RLS) no Postgres por `tenant_id`
- [ ] Migração de `user_id` direto para `tenant_id` no core
- [ ] API de convite e gestão de membros por tenant
- [ ] `budget_snapshots` — histórico imutável de orçamentos por mês

### Webapp
- [ ] Seletor de contexto (Pessoal / Família / Empresa)
- [ ] Dashboard multi-unidade: visão consolidada entre tenants
- [ ] Interface de gestão de membros e permissões por tenant
- [ ] Notificação in-app ao receber convite para um tenant
