# 02 — Fase 2: Expansão de Módulos

> **Status: ⚠️ Parcialmente Simplificada** — Veículos ✅ | Orçamentos ✅ (redesign) | Cartões ❌ removidos | Planejamento ❌ removido | Colaboração ❌ removida

> ⚠️ **Aviso de Simplificação:** Este documento descreve funcionalidades que foram implementadas mas posteriormente removidas para manter o sistema enxuto. Cartões (`cards`), transferências (`transfers`), planejamento de metas (`planning_plans`), colaboração (`account_access`) e manutenções de veículos (`vehicle_maintenances`) foram dropados nas migrations `000007` e `000011`. Orçamentos foram redesenhados na `000014` para derivar valores das transações. Consulte os documentos atuais para o estado real.

A Fase 2 originalmente expandiu o Tallyoh com módulos especializados. Grande parte desses módulos foi removida na simplificação de 2025.

---

## 1. Cartões de Crédito

### Backend
- [x] **Tabela `cards`:** Cartão de crédito com `credit_limit_cents`, `closing_day` e `due_day`. Associado a uma conta bancária de pagamento (`account_id`).
- [x] **Migration 000003:** Índice de fatura (`card_id + period`) para otimizar `GET /api/v1/cards/{id}/statement`.
- [x] **`GET /api/v1/cards/{id}/statement`:** Fatura do cartão filtrada por período (mês/ano), agrupando transações com `card_id`.
- [x] **`GET /api/v1/accounts/credit-summary`:** Limite total disponível vs utilizado em todos os cartões do usuário.

### Webapp
- [x] **Rota `/wallet/cards`:** CRUD de cartões com visualização de limite disponível e fatura atual.
- [x] **Indicador visual de utilização:** Barra de progresso de crédito na listagem de cartões.

---

## 2. Calendário Financeiro

### Backend
- [x] **`GET /api/v1/calendar`:** Retorna transações agrupadas por dia para exibição em calendário mensal. Inclui recebimentos futuros e vencimentos pendentes.

### Webapp
- [x] **Rota `/activity/calendar`:** Grade mensal com marcadores coloridos por tipo de transação (receita, despesa, transferência).

---

## 3. Módulo de Veículos e Frota

### Backend
- [x] **Tabela `vehicles`:** Cadastro de veículos com modelo, placa e ano.
- [x] **Tabela `refueling_logs`:** Abastecimentos com litros, preço/litro, odômetro e `transaction_id` vinculado (gera lançamento financeiro automaticamente).
- [x] **Tabela `vehicle_maintenances`:** Histórico de manutenções com custo e descrição, vinculado a transação financeira.
- [x] **`GET /api/v1/vehicles/{id}/expenses-stats`:** Custo total, média de km/L e custo por km calculados sobre o histórico de abastecimentos.
- [x] **`GET /api/v1/vehicles/{id}/refuelings`** e **`GET /api/v1/vehicles/{id}/maintenances`:** Histórico paginado por veículo.

### Webapp
- [x] **Rota `/wallet/vehicles`:** Cadastro de veículos com painel de estatísticas de custo.
- [x] **Rota `/settings/vehicles`:** Configuração e edição de veículos.

---

## 4. Orçamentos Mensais

### Backend
- [x] **Migration 000004:** Tabela `budgets` com `category_id`, `amount_cents` e `month` (YYYY-MM).
- [x] **`GET /api/v1/budgets/status`:** Comparativo real vs planejado do mês atual — para cada orçamento ativo, retorna o total gasto e o percentual consumido.
- [x] **CRUD completo:** `GET /api/v1/budgets`, `POST`, `PATCH /{id}`, `DELETE /{id}`.

### Webapp
- [x] **Rota `/planning/budgets`:** Lista de orçamentos do mês com barra de progresso e alerta visual quando >80% consumido.

---

## 5. Planejamento de Metas (Long-term Plans)

### Backend
- [x] **Migration 000005:** Tabelas `planning_plans` e `planning_items`.
- [x] **Migration 000006:** Campo `planning_id` em `transactions` para vincular aportes financeiros a planos de metas.
- [x] **`planning_plans`:** Meta de longo prazo com `target_amount_cents`, `deadline` e status.
- [x] **`planning_items`:** Itens individuais dentro de um plano (ex: "Entrada do apartamento", "Viagem").
- [x] **`planning_contributions`:** Aportes financeiros a um plano, gerando transação vinculada.
- [x] **CRUD completo:** planos, items e contribuições via `/api/v1/plans`.

### Webapp
- [x] **Rota `/planning/plans`:** Visualização de metas com progresso, prazo e itens individuais.

---

## 6. Colaboração em Contas (`account_access`)

### Backend
- [x] **Tabela `account_access`:** Acesso compartilhado a contas bancárias com `role` (OWNER, EDITOR, VIEWER).
- [x] **`POST /api/v1/accounts/{id}/members`:** Convida membro por `user_id`.
- [x] **`PATCH /api/v1/accounts/{id}/members/{userId}`:** Atualiza role de um membro.
- [x] **`DELETE /api/v1/accounts/{id}/members/{userId}`:** Revoga acesso.
- [x] **`GET /api/v1/accounts/{id}/members`:** Lista membros com suas permissões.

---

## 7. Importação e Exportação

### Backend
- [x] **`POST /api/v1/transactions/import-csv`:** Ingestão de extrato bancário em CSV. Cria transações em lote, respeitando `account_id` do usuário.
- [x] **`GET /api/v1/transactions/export`:** Exportação das transações filtradas em CSV para download.
- [x] **`GET /api/v1/transactions/future`:** Lista transações com data futura (agendamentos e recebimentos previstos).

### Webapp
- [x] **Privacy Mode:** Store Zustand (`privacy-store`) que aplica blur em todos os valores monetários da UI. Ativável com um toggle para uso em locais públicos.
