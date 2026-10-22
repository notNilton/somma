# Contas, cartões, recorrência e deploy — outubro de 2026

Registro do trabalho feito entre 21 e 22/10/2026: redesign do web, contas
bancárias com cartão de crédito, lançamentos (parcelas, recorrência, fatura),
categorias, alinhamento das migrations com a produção e o deploy pelo Gitea.

## Ponto de partida

- O backend em `backend/` é a **versão mínima** (sqlc) que substituiu, em
  08/10, o backend completo do commit `ab24ead`. Decisão: seguir com ela.
  Ela não tem orçamentos, metas, importação, configurações de conta,
  relatórios nem dashboard funcionando.
- O schema real é o de `database/migrations`. O `backend/internal/database/schema.sql`
  do sqlc descrevia outro banco; as tabelas usadas foram alinhadas com o real
  (`accounts`, `transactions`) e as que divergem (`credit_cards`, `categories`)
  são acessadas com pgx direto.
- O web chamava rotas `/api/v1/*` que não existiam na versão mínima e nunca
  enviava autenticação: todas as telas apareciam vazias.

## Modelo de dados e regras

### Conta bancária
- Campos: banco (código COMPE de 3 dígitos + nome), tipo (corrente, carteira,
  reserva, investimento), titular, CPF ou CNPJ (validado pelos dígitos
  verificadores, gravado só com números, exibido mascarado).
- **Saldo calculado**: `initial_balance_cents` + lançamentos ativos com data
  até agora (receita soma, despesa subtrai). Não contam: cancelados, compras no
  crédito e lançamentos futuros. Lançamento futuro aparece em Lançamentos e só
  pesa no saldo quando a data chega.
- `balance_cents` ficou como legado (lido só por código antigo da versão mínima).
- A reconciliação ajusta a base (`initialBalance`) pela diferença até o saldo real.
- O formulário não tem mais "depósito inicial": dinheiro entra por lançamento
  de Renda ligado à conta.

### Cartão de crédito
- **Cada conta tem no máximo um cartão** (`credit_cards.account_id`). Na compra
  no crédito escolhe-se a conta; o cartão dela é criado na primeira compra
  (sem limite, fecha 5, vence 15) ou ao configurar em Contas → Editar.
- Compra no crédito não mexe no saldo da conta; consome limite.
- **Usado** = compras no crédito ativas (inclusive parcelas e recorrências
  futuras) − pagamentos de fatura com data até hoje. Disponível = limite − usado.
- **Pagamento de fatura**: lançamento de despesa com `is_invoice_payment`,
  ligado ao cartão e à conta que pagou. Sai do saldo da conta e devolve limite.
  Não entra no gasto médio das Projeções (as compras já contaram).

### Lançamentos
- Tipos: Renda, Débito/Pix, Crédito, Poupança, Orçamento.
- **Parcelado** (só crédito): divide o total em N lançamentos mensais; os
  centavos que sobram vão na primeira parcela; datas no mesmo dia, limitado ao
  fim do mês (31/01 → 28/02).
- **Recorrente mensal**: uma linha por mês; a primeira é a origem da série
  (`recurring_origin_id` nas demais). Sem data final, cria 12 meses; máximo 5
  anos. Não combina com parcelamento. Um lançamento avulso pode virar
  recorrente na edição. Editar mexe só na ocorrência; excluir pode ser só ela ou
  "esta e as próximas".
- Datas são dias de calendário no horário de Brasília, gravadas ao meio-dia.

### Categorias
10 de gasto: Moradia, Contas da casa, Alimentação, Restaurantes e delivery,
Transporte, Saúde, Assinaturas e serviços, Lazer e viagens, Compras pessoais,
Educação e trabalho. 4 de renda (do seed): Salário & Pró-labore, Freelance &
Consultoria, Dividendos & Rendimentos, Cashback & Reembolsos.

## Banco de dados

Migrations novas (numeração final, alinhada com a produção):

| Versão | Arquivo | O que faz |
|---|---|---|
| 25 | `vehicles_and_refueling` | Restaurada da `origin/main` (já aplicada em produção) |
| 26–33 | `credit_cards` … `transaction_archival` | Eram 25–32; renumeradas |
| 34 | `account_bank_details` | Banco, titular, CPF/CNPJ, `balance_cents` |
| 35 | `account_credit_card` | Cartão ligado à conta (1 por conta) |
| 36 | `account_balance_from_ledger` | Recalcula a base para o saldo calculado manter o valor exibido |

**Por que renumerar**: a produção já estava na versão 25 (veículos) e a 25 local
era outra (`credit_cards`). O `migrate` guarda só o número, então a produção
pularia a criação de `credit_cards` e a 35 falharia, derrubando o backend.
Validado em bancos temporários: do zero (1 → 36) e simulando a produção
(migrations da `origin/main` até 25, depois as novas até 36).

O banco local teve só o número da versão ajustado de 35 para 36 (todas já
estavam aplicadas).

## Backend — rotas

| Rota | Função |
|---|---|
| `POST /api/auth/login`, `POST /api/auth/register` | Também gravam o cookie `somma_session` (HttpOnly) |
| `POST /api/auth/logout` | Apaga o cookie |
| `GET/POST /api/v1/accounts`, `PATCH/DELETE /api/v1/accounts/{id}` | Contas (exclusão lógica) |
| `PUT /api/v1/accounts/{id}/card` | Configura limite, fechamento e vencimento do cartão da conta |
| `POST /api/v1/accounts/{id}/card/payments` | Pagamento de fatura (`fromAccountId` opcional) |
| `GET /api/v1/cards`, `PATCH/DELETE /api/v1/cards/{id}` | Cartões com limite usado/disponível |
| `GET /api/v1/transactions?from&to` | Lançamentos do período (`to` inclusivo) |
| `POST /api/v1/transactions` | Cria; aceita `totalInstallments` ou `isRecurring` + `recurrenceEndDate` |
| `PATCH /api/v1/transactions/{id}` | Edita; `isRecurring` transforma avulso em série |
| `DELETE /api/v1/transactions/{id}[?scope=following]` | Exclui um ou a série a partir dele |
| `GET /api/v1/categories` | Categorias em árvore |

Arquivos principais: `internal/handlers/{account,ledger,creditcards,categories,auth}.go`,
`internal/models/document.go` (CPF/CNPJ), queries em `internal/database/queries/`.
Testes: `models/document_test.go`, `handlers/ledger_test.go`.

## Web

- **Visual**: linguagem reta e neutra (sem gradientes, sombras, cantos
  arredondados ou emojis) na landing, login/cadastro e no app. Overrides no fim
  de `src/index.css`.
- **Contas** (`/app/accounts`): patrimônio, distribuição por tipo, contas
  agrupadas, linha do cartão por conta, cadastro com banco/CPF/CNPJ/cartão.
- **Lançamentos**: só os dias com lançamento; dentro do dia, só os tipos usados;
  novo lançamento pelo botão flutuante; fonte maior; coluna de saldo cabe
  valores de seis dígitos; no celular, saldo e total vão abaixo do dia.
- **Painel de lançamento** (`/app/new`): abas Lançamento, Transferência e Pagar
  fatura; crédito escolhe a conta; "Repetir todo mês"; selos "mensal" e "fatura".
- **Projeções**: mesmo padrão de Contas; sempre o mês atual; cartões e simulador.
- **MoneyInput** (`src/components/MoneyInput.tsx`): vírgula decimal e ponto de
  milhar enquanto digita; entrega `"2411.57"` ao resto do código.
- 401 da API limpa a sessão local e leva ao login.

## Dados alterados (banco local, usuário nilton.naab@gmail.com)

- Contas fictícias do seed (Itaú, Inter, Nubank Conta Principal, Carteira,
  Reserva Selic, XP) e as 77 transações fictícias: **desativadas**
  (`is_active = false`), não apagadas.
- Cartões fictícios do seed (Nubank Ultravioleta, Itaú Infinite, Inter Black): desativados.
- Categorias de gasto do seed: apagadas (nenhum lançamento ativo as usava) e
  substituídas pelas 10 novas.
- Contas criadas: Nubank Pessoal (CPF), Nubank Empresarial (CNPJ), Banco do
  Brasil PF (CPF), Nomad. Os CPF/CNPJ são números de teste válidos.
- Depósitos de 21/10/2026 registrados como Renda nas contas.
- Cartões: Nubank Empresarial fecha 8 / vence 16 / limite R$ 12.000;
  Nubank Pessoal fecha 16 / vence 24 / limite R$ 8.000;
  Banco do Brasil PF fecha 20 / vence 28 / limite R$ 1.000.

## Deploy (22/10/2026)

- Commits na `main`, enviados ao remote `gitea` (fast-forward de `4428855` para
  `60b2b96`). O GitHub (`origin` também envia para lá) não foi atualizado.
- O CI agora publica `nilbyte/somma/expenses-backend` e `expenses-web`, os
  nomes que o servidor puxa (`infrastructure/apps/infra/somma`). A imagem do
  backend leva `migrate` e as migrations; o serviço `somma-migrate` roda
  `./migrate up` antes do backend subir.
- Versão 1.1.0 (backend e web).
- Ficaram fora dos commits: `app/` (mobile), alvo `make app` do `Makefile`,
  permissão do script de backup e `.legacy/`.
- Imagens testadas localmente com os Dockerfiles do CI: o backend subiu, rodou o
  migrate e respondeu 200 em login e nas rotas novas.
- **Status**: até a última verificação, os containers em produção ainda eram os
  antigos ("Up 4 days"); o resultado do pipeline precisa ser conferido em
  Actions no Gitea.

## Troca do banco de produção pelo local (pendente)

Pedido: apagar o banco de produção e usar o local no lugar. Acesso ao servidor:
host `niflheim-backup` do `~/.ssh/config` (IP público; o alias `niflheim` usa
Tailscale, que não está ativo nesta máquina). Banco: container
`nilbyte_postgres_prod`, base `somma`, compartilhada com o app de veículos.

Plano:
1. Confirmar que o deploy do código terminou (backend novo em produção).
2. Local: aplicar a migration 25 de veículos (tabelas vazias, para o app de
   veículos continuar subindo) e gerar `pg_dump -Fc`.
3. Servidor: backup da produção (`pg_dump`), parar `somma_expenses_backend_prod`
   e `somma_vehicles_backend_prod`, `DROP SCHEMA public CASCADE`, restaurar o
   dump local, subir os containers.
4. Entrar com nilton.naab@gmail.com e trocar a senha (a de desenvolvimento
   passa a valer em produção).

Execução bloqueada pelo modo automático do Claude Code até existirem regras de
permissão para `ssh -o BatchMode=yes niflheim-backup` e `docker exec somma-db-local`.

## O que ainda falta

- Faturas por mês (fechamento a fechamento) e pagar uma fatura específica;
  hoje o pagamento abate do total usado.
- Recorrência sem fim que se renova sozinha (o job `jobs/recurring_transactions.go`
  existe, não está ligado no `main.go` e não conhece contas/cartões).
- Telas sem backend na versão mínima: orçamentos, metas, importação,
  configurações de conta, relatórios, dashboard.
- Gerenciar categorias pelo app.
- Levar as categorias e contas reais para o `initial_seed.sql`, se o reset
  local deve mantê-las.
- Componentes sem uso: `CardsSettingsSection.tsx`, `CardInvoicesModal.tsx`,
  `FutureInstallmentsModal.tsx`.
