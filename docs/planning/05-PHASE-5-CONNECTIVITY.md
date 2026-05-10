# 05 — Fase 5: Conectividade e Integrações

> **Status: ⏳ Planejada**

A Fase 5 conecta o Personalledger ao ecossistema financeiro externo: importação de extratos no padrão Open Finance (OFX), integrações via webhooks, auditoria completa de alterações e garantia de idempotência para operações em lote.

---

## 1. Importação OFX / Open Finance

### Backend
- [ ] **Parser OFX/QFX:** Implementar leitor do formato Open Financial Exchange (padrão dos bancos brasileiros via Open Finance) para importação de extratos oficiais.
- [ ] **`POST /api/v1/transactions/import-ofx`:** Endpoint de ingestão de arquivo OFX. Retorna preview das transações antes da confirmação.
- [ ] **`POST /api/v1/transactions/import-ofx/confirm`:** Confirma a importação após revisão do usuário.
- [ ] **Deduplicação por hash:** Cada transação importada gera um hash `(account_id + date + amount + description)`. Impede re-importação do mesmo extrato.

### Webapp
- [ ] **Interface de importação OFX:**
    - Upload de arquivo com drag-and-drop
    - Preview tabular das transações detectadas
    - Checkbox para selecionar/desselecionar individualmente
    - Botão de confirmação com contagem de lançamentos a criar
- [ ] **Histórico de importações:** Lista de arquivos importados com data, banco de origem e quantidade de transações criadas.

---

## 2. Idempotência de Importações

### Backend
- [ ] **Migration:** Tabela `idempotency_keys` com `(user_id, key TEXT UNIQUE, status, created_at)`.
- [ ] **Chave por operação:** Para cada lote de importação, gerar uma chave baseada no hash do arquivo. Se a mesma chave for reenviada, retornar o resultado original sem reprocessar.
- [ ] **Aplicação no `import-csv` existente:** Retrofitar o endpoint de CSV para usar o mesmo mecanismo.

---

## 3. Auditoria de Alterações

### Backend
- [ ] **Migration:** Tabela `audit_logs` com `(user_id, entity_type, entity_id, action, before_state JSONB, after_state JSONB, created_at)`.
- [ ] **Middleware de auditoria:** Registrar automaticamente `UPDATE` e `DELETE` em `transactions` e `accounts`.
- [ ] **`GET /api/v1/audit-logs`:** Listagem paginada do histórico de alterações do usuário, com filtros por `entity_type` e período.

### Webapp
- [ ] **Painel de Auditoria em `/settings`:** Timeline de alterações recentes com diff visual (valor antes → valor depois).
- [ ] **Ícone de histórico por transação:** Na listagem de transações, indicar se a transação foi editada com link para ver o histórico de alterações.

---

## 4. Webhooks de Saída

### Backend
- [ ] **Migration:** Tabela `webhooks` com `(user_id, url, events TEXT[], secret, active)`.
- [ ] **Migration:** Tabela `outbox_events` com `(id, webhook_id, event_type, payload JSONB, status, attempts, next_retry_at)`.
- [ ] **`POST /api/v1/webhooks`:** Configurar endpoint de destino e lista de eventos de interesse.
- [ ] **Eventos suportados inicialmente:**
    - `transaction.created`
    - `budget.exceeded` (gasto ultrapassou 100% do orçamento)
    - `plan.completed` (meta de longo prazo atingida)
- [ ] **Worker de entrega:** Background job que lê `outbox_events` pendentes, faz POST para o endpoint configurado e registra o resultado. Retry com backoff exponencial em caso de falha.
- [ ] **Padrão Outbox:** Eventos são escritos na mesma transação da operação de negócio — garante que a notificação só dispara se o lançamento for commitado com sucesso.

### Webapp
- [ ] **Interface de Webhooks em `/settings`:** Cadastro e gerenciamento de endpoints com toggle de ativação e log de últimas entregas.
