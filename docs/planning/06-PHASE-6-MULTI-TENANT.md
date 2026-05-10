# 06 — Fase 6: Multi-Tenant e Colaboração Familiar

> **Status: ⏳ Planejada**

A Fase 6 transforma o Personalledger de um app mono-usuário em uma plataforma compartilhada. Um usuário poderá ter seu contexto "Pessoal" e participar de um contexto "Família Silva" ou "MEI" — com dados completamente isolados e permissões granulares entre os membros.

---

## Motivação

O modelo atual usa `user_id` diretamente em todas as tabelas. Isso funciona bem para uso individual, mas impede:
- Orçamentos familiares compartilhados onde vários membros lançam transações
- Separação entre finanças pessoais e de um negócio pequeno
- Visão consolidada de múltiplos contextos financeiros

A evolução é migrar para um modelo **tenant-first**, onde toda operação pertence a um `tenant_id`, e o `user_id` é apenas a identidade de quem executa a ação.

---

## 1. Modelo de Dados Multi-Tenant

### Backend
- [ ] **Migration:** Tabela `tenants` com `(id, slug, display_name, plan, created_at)`.
- [ ] **Migration:** Tabela `tenant_users` com `(tenant_id, user_id, role, invited_at, joined_at)`.
    - Roles: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`
- [ ] **Migração de `user_id` para `tenant_id`:** Todas as tabelas core (`accounts`, `categories`, `tags`, `budgets`, `planning_plans`) recebem `tenant_id NOT NULL` com a migração criando um tenant padrão por usuário existente.
- [ ] **Contexto de tenant no middleware:** `Auth` middleware extrai o tenant ativo do header `X-Tenant-ID` (ou contexto de sessão) e injeta no contexto da request.

### Row Level Security (RLS)
- [ ] **Habilitar RLS** no Postgres para todas as tabelas core.
- [ ] **Policy por tenant:** `CREATE POLICY tenant_isolation ON accounts USING (tenant_id = current_setting('app.tenant_id')::TEXT)`.
- [ ] **Configurar `app.tenant_id`** no pool `pgx` antes de cada query, garantindo que queries sem o contexto correto retornem zero resultados (fail-safe).

---

## 2. API de Gestão de Tenants

- [ ] **`POST /api/v1/tenants`:** Criar novo tenant (ex: "Família Silva").
- [ ] **`GET /api/v1/tenants`:** Listar tenants aos quais o usuário pertence.
- [ ] **`POST /api/v1/tenants/{id}/members/invite`:** Convidar membro por e-mail, gerando token de convite.
- [ ] **`POST /api/v1/tenants/accept-invite`:** Aceitar convite via token.
- [ ] **`PATCH /api/v1/tenants/{id}/members/{userId}`:** Alterar role de um membro.
- [ ] **`DELETE /api/v1/tenants/{id}/members/{userId}`:** Remover membro do tenant.

---

## 3. Snapshots de Orçamento

- [ ] **Migration:** Tabela `budget_snapshots` com `(budget_id, tenant_id, month, amount_cents, actual_cents, created_at)`.
- [ ] **Job mensal:** No virar do mês, registrar o estado final dos orçamentos (planejado vs realizado) como snapshot imutável.
- [ ] **`GET /api/v1/budgets/history`:** Retorna snapshots históricos por categoria para análise de cumprimento de orçamento ao longo dos meses.

---

## 4. Webapp — Troca de Contexto

- [ ] **Seletor de Tenant no header:** Dropdown para trocar rapidamente entre contextos (Pessoal / Família / MEI). Persiste a seleção via `localStorage`.
- [ ] **Dashboard Multi-Tenant:** Visão consolidada com totais por tenant e drill-down individual.
- [ ] **Gestão de membros:** Tela em `/settings` para gerenciar membros do tenant ativo, com indicação de role e status (ativo / convite pendente).
- [ ] **Notificação de convite:** Ao fazer login, verificar convites pendentes e exibir banner de convite com botão de aceitar/recusar.

---

## Ordem Prática de Implementação

1. **Criar `tenants` e `tenant_users`** — sem mexer ainda nas tabelas existentes.
2. **Criar um tenant default por usuário existente** via migration + seed.
3. **Adicionar `tenant_id` nas tabelas core** com `NOT NULL DEFAULT <tenant-do-usuário>`.
4. **Habilitar RLS** e validar que queries antigas continuam funcionando com o contexto correto.
5. **Expor API de gestão de tenants** e convites.
6. **Atualizar frontend** para troca de contexto.
