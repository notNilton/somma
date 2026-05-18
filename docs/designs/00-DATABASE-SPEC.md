# 00 - Arquitetura de Banco de Dados (Tallyoh Enxuto)

O Tallyoh opera com um modelo de banco intencionalmente enxuto, focado em transações como fonte da verdade. Orçamentos não possuem valores fixos — são derivados dinamicamente das transações vinculadas a cada item de orçamento.

**Direção Principal**
O modelo atual é centrado no usuário (`user_id`) e elimina complexidades legadas como contas bancárias, cartões e transferências explícitas.

```text
users (identidade)
sessions (auth)
categories (árvore de categorias por usuário)
tags (etiquetas transversais)
transactions (o core contábil — fonte da verdade)
budgets (orçamentos mensais/semestrais)
budget_items (itens de orçamento — sem valor fixo)
vehicles (módulo de frota pessoal)
```

---

## 1. Core Contábil: Transações como Fonte da Verdade

Toda movimentação financeira vive na tabela `transactions`. Não há tabelas separadas para transferências, abastecimentos ou manutenções — esses conceitos são expressos via:

- `type`: `INCOME`, `EXPENSE`, `TRANSFER`, `ADJUSTMENT`
- `classification`: `COMMON`, `FUEL`, `MAINTENANCE`, `TRANSFER`
- `vehicle_id`: vínculo opcional com frota
- `budget_id` / `budget_item_id`: vínculo opcional com orçamento

Valores monetários sempre em centavos (`BIGINT`).

## 2. Orçamentos Derivados

A tabela `budget_items` **não possui** `amount_cents`. O valor planejado e o gasto real de cada item são calculados em tempo de leitura a partir das transações vinculadas:

```sql
-- Orçamentado (INCOME vinculado ao item)
-- Gasto (EXPENSE vinculado ao item)
-- Tudo via budget_item_id em transactions
```

Isso elimina inconsistências entre orçamento e extrato, mas exige que o usuário crie transações de "receita" para alimentar o orçamento.

## 3. Módulo de Frota (Vehicles)

O Tallyoh mantém `vehicles` com dados cadastrais. Abastecimentos e manutenções são transações comuns (`classification = 'FUEL'` ou `'MAINTENANCE'`) vinculadas ao veículo. Não há tabelas separadas para `refueling_logs` ou `vehicle_maintenances`.

## 4. Chaves e Índices

Atualmente o Tallyoh usa `TEXT` com UUID. Manter essa estratégia para chaves públicas.

**Índices principais:**
- `idx_transactions_user_id_date` — queries de extrato
- `idx_transactions_budget_id` — agregação de orçamentos
- `idx_transactions_budget_item_id` — agregação por item
- `idx_budgets_user_id_target_date` — listagem de orçamentos
- `idx_categories_user_id` — filtros de categoria

## 5. Modelo Atual (pós-simplificação)

### Tabelas ativas
- `users` — perfil, credenciais, preferências
- `sessions` — tokens JWT ativos
- `categories` — receitas e despesas hierárquicas
- `tags` — etiquetas coloridas
- `transactions` — lançamentos financeiros (core)
- `budgets` — planos orçamentários
- `budget_items` — linhas de orçamento (sem valor fixo)
- `vehicles` — cadastro de frota

### Tabelas removidas (legado)
- ~~`accounts`~~ — dropada na `000011`
- ~~`cards`~~ — dropada na `000011`
- ~~`account_access`~~ — dropada na `000011`
- ~~`transfers`~~ — dropada na `000011`
- ~~`planning_plans`~~ — dropada na `000007`
- ~~`planning_plan_items`~~ — dropada na `000007`
- ~~`planning_contributions`~~ — dropada na `000007`
- ~~`vehicle_maintenances`~~ — dropada na `000007`

## 6. Evolução Futura (opcional)

1. **Consolidação do Core:** Garantir atomicidade nos cálculos de agregação de orçamento.
2. **Audit & Idempotency:** Camada de segurança para importações futuras (`audit_logs`, `idempotency_keys`).
3. **Multi-tenancy Real:** Migrar de `user_id` direto para `tenant_id` (Fase 6).
4. **Analytics & IA:** Camada de agregação para insights automáticos de economia (Fase 4).
