# 03 — Fase 3: Qualidade e Confiabilidade

> **Status: 🔄 Em andamento** — Testes unitários parciais ✅ | Testes de integração ⏳ | Playwright ⏳ | Reports ⏳

A Fase 3 eleva o padrão de confiabilidade do Tallyoh: cobertura de testes ampla, validações robustas na API, melhoria da UX de relatórios e primeiro passo rumo ao uso offline.

---

## 1. Testes de Backend

### Testes Unitários (Existentes)
- [x] `accounts_test.go` — ListAccounts, CreateAccount, DeleteAccount
- [x] `auth_test.go` — Register, Login, JWT validation
- [x] `cards_test.go` — CRUD de cartões
- [x] `categories_test.go` — CRUD de categorias
- [x] `dashboard_test.go` — monthly-evolution, category-breakdown
- [x] `settings_test.go` — profile, change-password
- [x] `tags_test.go` — CRUD de tags
- [x] `transactions_test.go` — ListTransactions, CreateTransaction, UpdateTransaction
- [x] `vehicles_test.go` — CRUD de veículos e stats

### Testes de Integração (Próximos)
- [ ] **Banco de teste isolado:** Setup de banco PostgreSQL em memória ou container dedicado para testes de integração, sem depender de mocks.
- [ ] **Testes de transferência atômica:** Validar que a criação de uma transferência cria dois lançamentos vinculados e atualiza os dois `balance_cents` de forma transacional.
- [ ] **Testes de importação CSV:** Validar comportamento com CSV malformado, campos faltantes e duplicados.
- [ ] **Testes de orçamento:** Validar que `GET /api/v1/budgets/status` calcula corretamente o gasto real cruzando transações do mês.

---

## 2. Validação e Resiliência da API

- [ ] **Validação centralizada:** Helper ou middleware para validar payloads de entrada (campos obrigatórios, tipos, ranges) antes de chegar nos handlers.
- [ ] **Rate limiting por usuário:** Proteção nos endpoints de escrita (`POST /transactions`, `POST /transactions/import-csv`) contra abuso acidental ou intencional.
- [ ] **Respostas de erro padronizadas:** Garantir que todos os erros retornem `{"error": "mensagem descritiva"}` com status HTTP correto — sem vazar stack traces.

---

## 3. Testes E2E (Webapp)

- [ ] **Playwright:** Configurar suite E2E cobrindo os fluxos críticos:
    - Login → visualizar Dashboard
    - Criar transação → verificar saldo da conta
    - Criar orçamento → verificar status
    - Criar plano → registrar contribuição → verificar progresso
- [ ] **CI integration:** Rodar Playwright no `ondev.yml` antes do merge para `main`.

---

## 4. Página de Relatórios

### Webapp — `/planning/reports`
- [ ] **Evolução patrimonial:** Gráfico de linha mostrando saldo total (soma de todas as contas) mês a mês.
- [ ] **Comparativo anual:** Receitas vs Despesas por mês em um gráfico de barras agrupadas.
- [ ] **Top categorias de gasto:** Ranking das categorias com maior gasto no período selecionado.
- [ ] **Análise de orçamento histórico:** Meses onde orçamentos foram cumpridos vs estourados.
- [ ] **Filtros por período:** Seletor de intervalo de datas aplicado a todos os gráficos da página.

---

## 5. Qualidade de Infraestrutura

- [ ] **Health check detalhado:** Expandir `GET /health` para incluir status da conexão com o banco (`db: ok|degraded`) e versão atual da migration aplicada.
- [ ] **Log de lentidão:** Logar automaticamente requisições com tempo de resposta >500ms para identificar queries lentas.
- [ ] **Modo offline básico (PWA):** Service Worker via `vite-plugin-pwa` para caching das rotas de leitura mais usadas (dashboard, listagem de transações). Permite uso em locais sem internet.
