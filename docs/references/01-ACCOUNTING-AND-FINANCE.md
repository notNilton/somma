# Referências: Contabilidade e Finanças (Personalledger)

Este documento compila a base teórica, as metodologias e os princípios financeiros que sustentam o **Personalledger**. O sistema foi projetado sobre os pilares da contabilidade clássica e estratégias modernas de gestão de patrimônio.

---

## 📚 1. Contabilidade de Partidas Dobradas (Double-Entry Bookkeeping)

O Personalledger utiliza o sistema de partidas dobradas para garantir a integridade dos dados financeiros. Cada transação é um fluxo de valor de uma conta de origem para uma de destino.

1. **Summa de Arithmetica, Geometria, Proportioni et Proportionalita**
   - *Autor:* Luca Pacioli (1494).
   - *Contexto:* O "Tratado de Contas e Escrituração" de Pacioli é a base histórica de todo o sistema financeiro moderno. Define o axioma de que para cada débito deve haver um crédito equivalente.

2. **Accounting Made Simple: Accounting Explained in 100 Pages or Less**
   - *Autor:* Mike Piper (2012).
   - *Contexto:* Uma introdução moderna e simplificada aos princípios contábeis básicos que regem a estrutura de Balanço Patrimonial e Demonstração de Resultados (DRE) aplicada no Personalledger.

---

## 💰 2. Metodologias de Orçamento (Budgeting Strategies)

A lógica de orçamentos e planejamento do sistema foi inspirada em métodos comprovados de controle de fluxo de caixa.

1. **Zero-Based Budgeting (ZBB)**
   - *Conceito:* "Dar um trabalho para cada centavo". Ao início de cada mês, cada real de renda é alocado a uma categoria (gastos, poupança ou investimento), deixando o saldo final planejado em zero.
   - *Implementação no Personalledger:* O módulo de `budgets` permite definir limites por categoria baseados no ZBB.

2. **Envelope Budgeting (Método dos Envelopes)**
   - *Conceito:* Divisão física (ou virtual) do dinheiro em categorias específicas. Se o envelope de "Lazer" está vazio, não há mais gastos nessa área até o próximo mês.
   - *Implementação no Personalledger:* O status visual dos orçamentos (barras de progresso) simula o preenchimento dos envelopes.

3. **Profit First: Transform Your Business from a Cash-Eating Monster to a Money-Making Machine**
   - *Autor:* Mike Michalowicz (2014).
   - *Contexto:* Embora focado em negócios, o princípio de separar a "margem de lucro" (ou poupança pessoal) antes de pagar as despesas é a base do módulo de `planning_plans`.

---

## 📈 3. Planejamento de Longo Prazo e Independência

1. **The Psychology of Money (A Psicologia Financeira)**
   - *Autor:* Morgan Housel (2020).
   - *Contexto:* Guia as premissas de UX do Personalledger, focando em comportamento e consistência em vez de apenas cálculos matemáticos complexos.

2. **FIRE Movement (Financial Independence, Retire Early)**
   - *Contexto:* O Personalledger oferece ferramentas de acompanhamento de patrimônio líquido (Net Worth) e metas de longo prazo inspiradas na regra dos 4% e cálculo de custo de vida projetado.

---

## 📐 4. Padrões e Normas

- **ISO 4217:** Código de moedas (ex: BRL, USD) utilizado na tabela de contas e transações.
- **BR GAAP / IFRS:** Embora simplificado para uso pessoal, o Personalledger segue a lógica de competência (data do gasto) vs. caixa (data do pagamento) em transações parceladas.
