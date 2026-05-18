# 04 — Fase 4: Inteligência Operacional

> **Status: ⏳ Planejada**

A Fase 4 transforma o Tallyoh de um registrador de dados financeiros em um assistente financeiro inteligente. A proposta é usar o histórico já acumulado pelo usuário para oferecer insights automáticos, sugestões e projeções sem exigir configuração manual.

---

## 1. Detecção de Recorrência

### Backend
- [ ] **Algoritmo de detecção:** Analisar o histórico de transações do usuário e identificar padrões recorrentes por: descrição similar + mesmo `account_id` + intervalo regular (mensal, semanal).
- [ ] **Tabela `recurrences`:** Armazenar padrões detectados com `frequency`, `estimated_amount_cents`, `next_expected_date` e `category_id`.
- [ ] **`GET /api/v1/recurrences`:** Listar recorrências detectadas para revisão do usuário.
- [ ] **`PATCH /api/v1/recurrences/{id}`:** Confirmar, ignorar ou ajustar uma recorrência detectada.

### Webapp
- [ ] **Painel "Compromissos Fixos":** Lista de recorrências confirmadas com próxima data e valor esperado.
- [ ] **Alerta de recorrência detectada:** Notificação inline ao cadastrar transação similar a uma recorrência existente.

---

## 2. Sugestão Automática de Categoria

### Backend
- [ ] **Engine de sugestão:** Ao criar uma transação com descrição fornecida, retornar as categorias mais frequentemente usadas em transações com descrição similar (matching por substring ou trigram do Postgres).
- [ ] **`GET /api/v1/categories/suggest?description=<texto>`:** Endpoint de sugestão em tempo real para uso no formulário de transação.

### Webapp
- [ ] **Autocomplete de categoria:** No formulário de nova transação, exibir sugestões de categoria com base na descrição digitada.
- [ ] **Aprendizado implícito:** Quando o usuário confirma ou corrige uma sugestão, esse dado reforça o modelo de sugestão.

---

## 3. Projeção de Saldo

### Backend
- [ ] **`GET /api/v1/dashboard/balance-projection`:** Calcula o saldo esperado para os próximos 30 dias, somando:
    - Transações futuras já cadastradas (`transactions.date > today`)
    - Recorrências confirmadas com `next_expected_date` no período
- [ ] **Granularidade diária:** Retorna um array `{date, projected_balance_cents}` para plotagem de gráfico.

### Webapp
- [ ] **Gráfico de projeção no Dashboard:** Linha tracejada no gráfico de evolução de saldo, indicando o saldo projetado nos próximos 30 dias.
- [ ] **Indicador "Saldo mínimo projetado":** Alerta visual se a projeção indicar saldo negativo em algum dia do mês.

---

## 4. Análise de Tendências e Anomalias

### Backend
- [ ] **`GET /api/v1/analytics/trends`:** Variação percentual de gastos por categoria comparando o mês atual com a média dos últimos 3 meses.
- [ ] **`GET /api/v1/analytics/anomalies`:** Identifica transações com valor discrepante em relação à média histórica da categoria (ex: gasto 3x maior que o usual em "Restaurante").

### Webapp
- [ ] **Painel de Insights no Dashboard:** Cards automáticos mostrando:
    - "Você gastou 40% mais com Transporte esse mês"
    - "Receita de Freelance 20% abaixo da média"
    - "Gasto incomum detectado: R$ 850 em Supermercado"
- [ ] **Drill-down por insight:** Clicar em um insight navega para a listagem de transações filtrada pelo contexto.
