# TODO Frontend — Mirante Webapp


## 🔌 1. Funções de API (`src/lib/api.ts`)

Adicionar as chamadas para todos os novos endpoints do backend.

### Dashboard & Analytics
- [x] `getDashboard(month?: string)` — `GET /api/v1/dashboard?month=YYYY-MM`
- [x] `getMonthlyEvolution()` — `GET /api/v1/dashboard/monthly-evolution`
- [x] `getCategoryBreakdown(month?: string, type?: string)` — `GET /api/v1/dashboard/category-breakdown`

### Transfers
- [x] `listTransfers()` — `GET /api/v1/transfers`
- [x] `createTransfer(dto)` — `POST /api/v1/transfers`
- [x] `deleteTransfer(id)` — `DELETE /api/v1/transfers/{id}`

### Budgets
- [ ] `listBudgets(month?: string)` — `GET /api/v1/budgets?month=YYYY-MM`
- [ ] `getBudgetsStatus(month?: string)` — `GET /api/v1/budgets/status?month=YYYY-MM`
- [ ] `createBudget(dto)` — `POST /api/v1/budgets`
- [ ] `updateBudget(id, dto)` — `PATCH /api/v1/budgets/{id}`
- [ ] `deleteBudget(id)` — `DELETE /api/v1/budgets/{id}`

### Calendar
- [ ] `getFinancialCalendar(from?: string, to?: string)` — `GET /api/v1/calendar`

### Cards — Statement
- [ ] `getCardStatement(cardId, from?, to?)` — `GET /api/v1/cards/{id}/statement`

### Transactions — Exportação
- [ ] `exportTransactions(from, to)` — `GET /api/v1/transactions/export` (retorna Blob/CSV)

### Colaboração (Account Members)
- [ ] `listAccountMembers(accountId)` — `GET /api/v1/accounts/{id}/members`
- [ ] `inviteMember(accountId, dto)` — `POST /api/v1/accounts/{id}/members`
- [ ] `updateMemberRole(accountId, userId, role)` — `PATCH /api/v1/accounts/{id}/members/{userId}`
- [ ] `revokeMember(accountId, userId)` — `DELETE /api/v1/accounts/{id}/members/{userId}`

---

## 📊 2. Dashboard (`src/routes/index.tsx`)

### Seletor de período
- [x] Adicionar seletor de mês (ex: `<select>` com os últimos 12 meses + mês atual como padrão)
- [x] Passar `month` como parâmetro de busca para a query do dashboard
- [x] Persistir mês selecionado em `searchParams` da rota

### Gráfico de evolução mensal
- [x] Adicionar seção "Evolução dos últimos 6 meses" abaixo dos MetricCards
- [x] Usar `BarChart` ou `AreaChart` do Recharts com dados de `getMonthlyEvolution()`
- [x] Duas séries: receita (verde) e despesa (vermelho), eixo X = mês
- [x] Mostrar variação líquida (net) como linha sobreposta opcional

### Breakdown por categoria
- [x] Adicionar seção "Maiores categorias de gasto" no dashboard
- [x] Usar `PieChart` ou `BarChart` horizontal do Recharts com dados de `getCategoryBreakdown()`
- [x] Toggle EXPENSE / INCOME para alternar a visualização
- [ ] Respeitar `PrivacyAmount` nos valores exibidos

---

## 💸 3. Transferências (`src/routes/transfers/`)

### Nova página `/transfers`
- [x] Criar `src/routes/transfers.tsx` (layout) e `src/routes/transfers/index.tsx`
- [x] Listar transferências com origem → destino, valor e data
- [x] Botão "Nova Transferência" abre `TransferModal`
- [x] Ação de excluir transferência com `ConfirmDialog`

### Novo componente `TransferModal.tsx`
- [x] Campos: conta de origem (select), conta de destino (select), valor, data, descrição opcional
- [x] Validação: contas diferentes, valor > 0
- [x] Ao confirmar, chama `createTransfer()` e invalida queries

### Navegação
- [x] Adicionar link "Transferências" no `Header.tsx` (desktop)
- [x] Adicionar item no `BottomNav.tsx` ou acessar via modal no FAB

---

## 💳 4. Fatura de Cartão (`src/routes/cards/`)

### Nova página `/cards`
- [x] Criar `src/routes/cards.tsx` e `src/routes/cards/index.tsx`
- [x] Listar cartões do usuário (já existe `GET /api/v1/cards`)
- [x] Cada cartão com chip colorido, bandeira, últimos 4 dígitos, limite disponível
- [x] Botão "Ver Fatura" abre `CardStatementDrawer`

### Novo componente `CardStatementDrawer.tsx`
- [x] Drawer/Sheet lateral com fatura do cartão selecionado
- [x] Seletor de período de fechamento (inicia com período atual inferido pelo backend)
- [x] Separação visual: **Compras** (despesas reais) vs **Pagamento de Fatura** (informativo)
- [x] Total de compras em destaque
- [x] Lista de transações da fatura com categoria, valor e data
- [ ] Botão "Pagar fatura" → abre `TransferModal` pré-preenchido

### Navegação
- [x] Adicionar "Cartões" no Header desktop

---

## 📅 5. Calendário Financeiro (`src/routes/calendar/`)

### Nova página `/calendar`
- [x] Criar `src/routes/calendar.tsx` e `src/routes/calendar/index.tsx`
- [x] Visualização de grade mensal (calendário) com indicadores por dia
- [x] Dias com transações PENDING destacados em amarelo/âmbar
- [x] Dias com INCOME destacados em verde, EXPENSE em vermelho
- [x] Clicar em um dia expande as transações daquele dia
- [x] Seletor de mês para navegar

### Navegação
- [x] Adicionar link "Calendário" no Header ou no BottomNav

---

## 🎯 6. Orçamentos (`src/routes/budgets/`)

### Nova página `/budgets`
- [x] Criar `src/routes/budgets.tsx` e `src/routes/budgets/index.tsx`
- [x] Seletor de mês no topo
- [x] Cards de orçamento com barra de progresso (`PercentUsed`)
  - Verde se < 80%, âmbar se 80–99%, vermelho se > 100%
  - Texto "R$ X de R$ Y usado"
- [x] Card especial para orçamentos **estourados** com badge de alerta
- [x] Botão "Novo Orçamento" → abre `BudgetModal`
- [x] Ação de editar e excluir em cada card

### Novo componente `BudgetModal.tsx`
- [x] Campos: categoria (select com cores), valor limite, mês, ano, observações
- [x] Modo criação e edição
- [x] Ao salvar: `createBudget()` ou `updateBudget()` + invalidar queries

### Integração no Dashboard
- [ ] Adicionar seção resumida de orçamentos no dashboard (os 3 mais próximos do limite)
- [ ] Link "Ver todos" para `/budgets`

### Navegação
- [x] Adicionar "Orçamentos" no `Header.tsx` (substituir o comentário `{/* Orçamentos/Metas removidos */}`)
- [ ] Adicionar no `BottomNav.tsx` (considerar substituir "Veículos" por "Orçamentos" ou usar ícone de menu)

---

## 📤 7. Exportação de Transações

- [x] Adicionar botão "Exportar CSV" na página de transações (`/transactions/`)
- [x] Abrir mini-modal com seletor de período (from/to)
- [x] Chamar `exportTransactions(from, to)` e disparar download automático do arquivo
- [x] Posicionar ao lado do botão "Importar" já existente

---

## 👥 8. Colaboração — Membros de Conta

- [ ] Adicionar aba/seção "Membros" na tela de detalhes/edição de conta (`/accounts/crud-accounts`)
- [ ] Listar membros com nome, email e role (EDITOR/VIEWER)
- [ ] Formulário inline para convidar por email com seletor de role
- [ ] Botão de revogar acesso com `ConfirmDialog`
- [ ] Botão de alternar role (EDITOR ↔ VIEWER)

---

## 🔧 9. Ajustes Gerais

### Navegação — Header e BottomNav
- [ ] Desktop Header: adicionar links para Orçamentos, Cartões, Transferências, Calendário
  - Sugestão: agrupar em dropdown "Mais" para não sobrecarregar
- [ ] Mobile BottomNav: hoje tem 5 itens fixos. Considerar substituir "Veículos" por aba "Mais" com drawer de navegação secundária

### Dashboard — Conectar `month` ao parâmetro real
- [ ] Atualizar `useQuery` do dashboard para passar o mês selecionado
- [ ] Garantir que `safeToSpend` e `monthlyExpenses` excluem transferências (já corrigido no backend)

### Transações — Filtro por classificação
- [ ] Adicionar filtro `classification` (COMMON, FUEL, MAINTENANCE, TRANSFER) na barra de filtros existente
- [ ] Esconder transferências do resumo mensal na listagem (ou marcar visualmente)

### Cartões — CRUD completo
- [ ] As rotas `UpdateCard` e `DeleteCard` existem no backend mas não há UI para editar/deletar cartões
- [ ] Adicionar botões de editar/excluir na listagem de cartões (quando criada a página `/cards`)

---

## 🗂️ Ordem de Implementação Sugerida

```
1. api.ts — adicionar todas as funções novas (base para tudo)
2. Dashboard — seletor de mês + gráfico de evolução mensal
3. Dashboard — breakdown por categoria
4. Orçamentos — página + modal (alto valor, visível no dashboard)
5. Exportação CSV — botão na tela de transações (rápido)
6. Transferências — página + modal
7. Fatura de Cartão — página de cartões + drawer
8. Calendário Financeiro
9. Colaboração — membros de conta
10. Navegação — Header/BottomNav com novos links
```

---

## 📦 Componentes Novos (Resumo)

| Componente | Tipo | Usado em |
|------------|------|----------|
| `TransferModal.tsx` | Modal | `/transfers` |
| `BudgetModal.tsx` | Modal | `/budgets` |
| `CardStatementDrawer.tsx` | Sheet/Drawer | `/cards` |
| `MembersPanel.tsx` | Seção inline | `/accounts/crud-accounts` |
| `MonthSelector.tsx` | Input reutilizável | Dashboard, Budgets, Calendar |
| `BudgetProgressCard.tsx` | Card | `/budgets`, Dashboard |
| `CalendarGrid.tsx` | Componente visual | `/calendar` |

---

## 🚀 Rotas Novas (Resumo)

| Arquivo | Rota | Prioridade |
|---------|------|-----------|
| `src/routes/budgets.tsx` + `index.tsx` | `/budgets` | Alta |
| `src/routes/transfers.tsx` + `index.tsx` | `/transfers` | Alta |
| `src/routes/cards.tsx` + `index.tsx` | `/cards` | Média |
| `src/routes/calendar.tsx` + `index.tsx` | `/calendar` | Média |
