# TODO

## Backend

- [x] Password reset / "Esqueci minha senha" — fluxo completo de recuperação de senha por e-mail com tokens seguros ([detalhes](todo/forgot_password.md))
- [x] Recurring transaction engine — cron job that generates transactions from a recurrence rule (frequency, interval, end date); idempotent so re-runs are safe
- [x] Budget alert jobs — fire when spending reaches configurable thresholds (e.g. 80%, 100%) per envelope; debounce to avoid duplicate alerts
- [x] OFX/QIF import — parse bank statement files, deduplicate against existing transactions by date+amount+description hash
- [x] Per-user rate limiting — token bucket in-process (or Redis), keyed by user ID, separate limits for read vs write routes
- [x] Soft delete for transactions — `deleted_at` column + filtered queries; allows undo without data loss
- [x] Pagination on all list endpoints — cursor-based (keyset) rather than offset for large datasets
- [x] `GET /analytics/trends` — month-over-month delta per category, moving average
- [x] Gestor Financeiro Inteligente (cartões, parcelamentos, projeção preditiva, multi-contas, 50/30/20) — especificações funcionais e arquiteturais ([detalhes](todo/financial_manager_features.md))

## Web

- [x] Landing page pública — página institucional apresentando o produto, diferenciais e chamadas para ação (CTAs) ([detalhes](todo/landing_page.md))
- [x] Password input UX & Clipboard — botão para exibir/ocultar senha digitada e suporte confiável a copiar/colar e gerenciadores de senhas ([detalhes](todo/auth_ux_improvements.md))
- [ ] Offline support — cache API responses in service worker (`workbox`); queue mutations and replay on reconnect
- [x] Mobile layout — bottom nav bar, touch-friendly transaction form, swipe-to-delete
- [x] Dark mode — CSS variables already partial; wire to `prefers-color-scheme` + manual toggle persisted in localStorage
- [x] Empty states — zero-data screens for budgets, goals, transactions com CTAs acionáveis
- [x] Keyboard shortcuts — `n` novo lançamento, `f` alternar filtros, `t` transações, `c` configurações, `?` ajuda, `ESC` fechar modal
- [x] **Gestão de Contas Bancárias & Carteiras**:
  - [x] Cadastro, edição e listagem de contas (Corrente, Carteira/Dinheiro, Reserva, Investimentos) na tela de Configurações
  - [x] Seletor de conta bancária de origem/destino no modal de lançamento (Débito/Pix e Renda)
  - [x] Painel/Card de saldos consolidados por conta no topo ou barra lateral
  - [x] Modal de transferência entre contas próprias (transação neutra entre saldos)
  - [x] Ferramenta rápida de reconciliação de saldo real
- [x] **Gestão e Ciclo Real de Cartões de Crédito**:
  - [x] Cadastro de cartões de crédito (nome, bandeira, limite total, dia de fechamento e dia de vencimento) em Configurações
  - [x] Seleção de cartão de crédito e seletor de parcelamento (`1x` até `24x`) no modal de lançamento
  - [x] Tela/Aba de faturas de cartão: visualização de Fatura Aberta, Fechada e Paga com data de corte e limite restante
  - [x] Fluxo de "Pagar Fatura" debitando de uma conta corrente sem duplicar despesas
  - [x] Linha do tempo de parcelamentos futuros (visualizar o comprometimento de renda nos próximos meses)
- [x] **Orçamentos, Metas e Alertas (Budgeting)**:
  - [x] Tela visual de orçamentos por categoria com barras de progresso e limites mensais
  - [x] Visão metodológica 50/30/20 (Necessidades 50%, Desejos 30%, Futuro/Investimentos 20%)
  - [x] Gestão de Caixinhas / Metas de poupança (Goals) com valor acumulado e data-alvo
- [x] **Projeção Preditiva e Fluxo de Caixa Futuro (Cashflow Runway)**:
  - [x] Curva de saldo previsto dia a dia até o fim do mês (receitas fixas - despesas recorrentes - faturas)
  - [x] Alerta de caixa negativo antecipado antes do vencimento de contas
  - [x] Simulador de compras e impacto de novos parcelamentos
- [x] **Importação e Automação de Dados**:
  - [x] Interface de importação de extratos bancários (OFX e CSV) com conciliação prévia
  - [x] Detecção de duplicidades antes de confirmar em lote
  - [x] Regras visuais de autocategorização por palavra-chave (ex: `UBER` -> Transporte)
- [x] **Analytics & Relatórios Avançados**:
  - [x] Comparativo Month-over-Month (MoM) de desvios e economias por categoria
  - [x] Radar de assinaturas e despesas recorrentes com custo anualizado
  - [x] Filtros avançados combinados (por conta, cartão, período, categoria e tags) e busca global
  - [x] Exportação de relatórios em CSV e PDF
- [x] **Ações em Lote e Usabilidade**:
  - [x] Seleção múltipla de transações (`bulk actions`) para exclusão ou recategorização em lote
  - [x] Upload e pré-visualização de comprovantes/recibos anexados à transação
  - [x] Suporte a multi-moedas na interface (conversão USD/EUR para BRL com IOF e spread)

## Database

- [x] Transaction archival — move rows older than N months to `transactions_archive` (same schema); exclude from default queries via view
- [x] Read replica config — `DATABASE_READONLY_URL` env var; route `GET` handlers to replica in `config` package
- [x] Index audit — run `pg_stat_user_indexes` in production and drop unused indexes

## Infrastructure

- [x] PostgreSQL backup — daily `pg_dump` to MinIO via cron on the VPS; retain last 30 days; alert on failure
- [x] External health check — expose `GET /healthz` (already exists); register with an uptime monitor (e.g. UptimeRobot)
- [x] Log aggregation — ship container logs to a central store (Loki or similar) for querying across restarts
- [x] Resource limits on compose services — set `mem_limit` and `cpus` on backend and web containers in production compose
