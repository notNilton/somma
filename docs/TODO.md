# TODO: Project Budget - Status de Implementação

Com base nos documentos de design detalhados e no estado atual da base de código (`apps/backend` e `apps/webapp`), aqui está o status macro das implementações e as próximas tarefas (TODOs) do projeto.

---

## ✅ FASE 0: Fundação e Infraestrutura (Concluído)

A infraestrutura e estrutura base do monorepo foram estabelecidas com sucesso.

- [x] **Backend (NestJS)**: Estrutura inicial e módulos core configurados (`app.module.ts`).
- [x] **Webapp (TanStack Start + Vite)**: Setup inicial extremamente otimizado com rotas baseadas em arquivos e UI Premium.
- [x] **Banco de Dados (Prisma + PostgreSQL)**: Módulo de banco (`database`) presente e configurado.
- [x] **Autenticação & Segurança (WorkOS)**: Módulos de `auth` e `users` implementados no backend.

---

## 🚀 FASE 1: MVP Essencial & UI Premium (Concluído)

O webapp foi simplificado e tornado mais prático, com todas as funcionalidades essenciais de interface prontas.

- [x] **Gestão de Contas**: Módulo `accounts` (Backend) e tela `accounts.tsx` funcional no Webapp.
- [x] **Motor de Lançamentos**: Módulo `transactions` (Backend) e tela `transactions.tsx` completa com filtros avançados.
- [x] **Categorização**: Módulo `categories` (Backend) criado e suporte na UI.
- [x] **Importação de Dados (OFX/CSV)**: Fluxo de importação (`import.tsx`) implementado.
- [x] **Dashboards**: Rota raiz (`index.tsx`) com resumo financeiro completo (Net Worth, Safe-to-Spend).
- [x] **Quick Add**: Modal de transação rápido e FAB funcional em todas as telas.
- [x] **Modo Oculto (Privacy Mode)**: Suporte global via componente `PrivacyAmount`.

---

## ✨ FASE 2: Experiência Completa & Evolução (Em Produção)

A fase de evolução foi integrada em uma interface centralizada e prática, facilitando o acompanhamento de metas e veículos.

- [x] **Evolução Financeira**: Tela `evolution.tsx` consolidando Orçamentos, Metas e Combustível.
- [x] **Gestão de Metas (Goals)**: Interface de acompanhamento de sonhos e reserva de emergência concluída.
- [x] **Módulo de Veículos (Fleet)**: Gestão de abastecimentos e eficiência integrada na aba de Evolução.
- [x] **Orçamentos Avançados**: Visualização de limites por categoria e insights de gasto.
- [ ] **Integração Real (Backend)**: Conectar todos os mocks da UI aos serviços reais do NestJS.
- [ ] **Cartões de Crédito Inteligentes**: Implementar lógica de faturas e conciliação.
- [ ] **Recorrência & Parcelamentos**: Implementar desdobramento automático no backend.

---

## 💰 FASE 4: Recursos Avançados (Planejado)

- [ ] **Colaboração Familiar**: Contas compartilhadas e divisão de gastos (Split).
- [ ] **Calendário Financeiro**: Notificações e visão mensal de vencimentos.

---

## ⚡ FASE 5: Performance & Infraestrutura

### Redis / Cache

- [ ] **Cache de usuário no JwtAuthGuard** — eliminar query ao banco em toda requisição autenticada (TTL 5 min)
- [ ] **Cache do Dashboard** — endpoint faz 9+ queries por acesso; cache com TTL 3 min + invalidação no CRUD de transação
- [ ] Instalar `ioredis`, `@nestjs/cache-manager`, `cache-manager-ioredis` e registrar `CacheModule` global

---

## 📊 FASE 6: Analytics & Relatórios

### Dashboard

- [ ] **Seletor de período** — permitir visualizar qualquer mês, não só o atual
- [ ] **Gráfico de evolução mensal** — receita vs despesa nos últimos 6 meses
- [ ] **Breakdown por categoria** — gráfico de pizza/barras com top categorias de gasto

### Relatórios

- [ ] **Tela `/reports`** — gastos por categoria (comparativo mês a mês), evolução de saldo (`BalanceHistory` já existe), top 5 categorias

### Exportação

- [ ] **Endpoint `GET /transactions/export`** — retorna CSV com filtros `from` / `to`
- [ ] **Botão "Exportar"** na tela de transações ao lado do "Importar"

---

## 💳 FASE 7: Crédito & Transferências

### Fatura de Cartão

- [ ] **Resumo da barra de transações** — separar "Despesas" (compras no crédito + débito/pix) de "Fatura Paga" (informativo de caixa); Saldo = Receitas − Despesas sem duplicar pagamento de fatura
- [ ] Documentar regra: compras no crédito são despesas no mês em que ocorrem; pagamento de fatura é saída de caixa informativa, não reconta como despesa

### Transferências entre Contas

- [ ] **Tela de Transferências** — usar modelo `Transfer` já existente no schema; tela `/transfers` ou modal dedicado
- [ ] Garantir que transferência não aparece como despesa/receita no resumo mensal

---

## 🔔 FASE 8: Notificações & Orçamentos

### Orçamentos (Budget)

- [ ] **Modelo `Budget` no schema** — limite mensal por categoria, período, userId
- [ ] **Backend** — módulo `budgets` (controller + service + DTOs)
- [ ] **Frontend** — cards de orçamento no dashboard com barra de progresso (% utilizado)
- [ ] **Alerta visual** quando categoria ultrapassar o limite

### Notificações

- [ ] Instalar `Bull` / `BullMQ` e usar Redis já disponível no `docker-compose.yml`
- [ ] **Job: vencimento de fatura** — `Card.dueDay` já calculado, só falta disparar lembrete
- [ ] **Job: orçamento estourado** — dispara quando despesa da categoria ultrapassa o limite definido
- [ ] **Job: recorrência não paga** — alerta para transações recorrentes PENDING

---
