# 00 - Arquitetura de Banco de Dados (Evolução Mirante)

Se a meta final é transformar o Mirante de um app de finanças pessoais em uma plataforma de gestão financeira robusta (multi-usuário, multi-carteira e possivelmente B2B/Family Office), o banco atual é a fundação sólida, mas precisa evoluir de um modelo centrado no usuário para um modelo "Platform-First".

**Direção Principal**
O modelo atual é baseado em Partidas Dobradas (implícitas via `transactions` e `accounts`) e focado em `user_id`.

Para servir grupos familiares, empresas e colaboração real, a arquitetura deve evoluir para suportar isolamento e compartilhamento granular:

```text
tenants (ex: Família Silva, Empresa X)
tenant_users (permissões dentro do tenant)
users (identidade global)
accounts (carteiras, bancos, cofres)
categories (árvore de categorias por tenant/global)
tags (etiquetas transversais)
transactions (o core contábil)
transfers (vínculo de movimentação)
budgets (planejamento mensal)
planning_plans (metas de longo prazo)
vehicles (módulo de frotas/pessoal)
refueling_logs
vehicle_maintenances
audit_logs
idempotency_keys
outbox_events
```

**1. Multi-tenant e Colaboração Familiar**
O ponto mais importante é introduzir `tenants`. Atualmente o Mirante usa `account_access` para compartilhamento, o que é um bom começo, mas para escala:

- `tenants`
  - `id`, `slug`, `display_name`, `plan`, `settings jsonb`
- `tenant_users`
  - Relação N:N entre usuário e tenant
  - `role` (OWNER, ADMIN, MEMBER, VIEWER)

Isso permite que um usuário tenha sua "Finança Pessoal" e participe da "Finança Familiar" ou "Pequena Empresa" de forma isolada e segura.

**2. Core Contábil: Partidas Dobradas Explícitas**
Hoje, o Mirante já usa `amount_cents` (BIGINT) para evitar erros de arredondamento. A evolução natural é tornar as partidas dobradas mais auditáveis:

- `accounting_entries`
  - `transaction_id`
  - `account_id`
  - `amount_cents` (positivo para débito, negativo para crédito)
  
Isso permite reconciliações bancárias perfeitas e balancetes em tempo real sem depender apenas da soma da tabela de transações.

**3. Idempotência e Confiabilidade**
Para integrações via Open Finance ou importações massivas de CSV/OFX:

- `idempotency_keys`
  - `tenant_id`, `key` (hash do payload/origem)
  - `status`, `response_snapshot`
  
Evita duplicidade de lançamentos se o usuário clicar duas vezes ou se o worker de importação falhar no meio do processo.

**4. Módulo de Frota (Vehicles) como Domínio Separado**
O Mirante já possui `vehicles`, `refueling_logs` e `maintenances`. A evolução aqui é:

- `vehicle_metrics`
  - Agregados de km/L, custo por km e depreciação.
- `maintenance_schedules`
  - Alertas preventivos baseados em tempo ou km projetada.

**5. Orçamentos e Planejamento (Planning)**
A estrutura de `planning_plans` e `budgets` deve suportar versionamento:

- `budget_snapshots`
  - Para comparar "Planejado vs Realizado" historicamente sem que mudanças no orçamento do mês atual afetem o histórico.

**6. Isolamento e Segurança (RLS)**
Recomendação para o Mirante:
- Utilizar **Row Level Security (RLS)** do PostgreSQL baseado no `tenant_id` (ou `user_id` na fase atual).
- Garantir que toda query de leitura/escrita passe pelo filtro de tenant/user no nível do banco, não apenas na aplicação.

**7. Auditoria Financeira**
Obrigatório para qualquer sistema que lida com dinheiro:

- `audit_logs`
  - Quem alterou qual transação? Qual era o valor antigo?
  - `before_state jsonb`, `after_state jsonb`

**8. Integração e Webhooks**
Para automação (ex: "Se gastar mais de 80% do orçamento de Lazer, avise no Telegram"):

- `webhooks`
- `outbox_events` (Garante que a notificação seja disparada apenas se a transação for commitada com sucesso).

**9. Chaves e Índices**
Atualmente o Mirante usa `TEXT` com UUID. Manter essa estratégia para chaves públicas, mas considerar `BIGSERIAL` para chaves primárias internas em tabelas de log/transações massivas se o volume atingir milhões de registros.

**10. Ordem Prática de Evolução**
1. **Consolidação do Core:** Garantir que todos os cálculos de `balance_cents` sejam atômicos.
2. **Audit & Idempotency:** Camada de segurança para importações.
3. **Multi-tenancy Real:** Migrar de `user_id` direto para `tenant_id`.
4. **Analytics & IA:** Camada de agregação para insights automáticos de economia.
