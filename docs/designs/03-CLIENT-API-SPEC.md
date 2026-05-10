# 03 - Especificação de API Client (Bruno)

O diretório `client-api/` contém uma coleção do [Bruno](https://www.usebruno.com/) para interação direta com o backend do Personalledger. Esta coleção reflete a **arquitetura enxuta atual** — endpoints removidos (contas, cartões, transferências, calendário) foram eliminados da documentação.

## Pré-requisitos

1.  **Instalar Bruno**: [Download em usebruno.com](https://www.usebruno.com/downloads).
2.  **Abrir Coleção**: No Bruno, clique em "Open Collection" e selecione a pasta `client-api`.
3.  **Ambiente**: Utilize o ambiente `environments/Development.yml` para configurar a `baseUrl` (padrão: `http://localhost:3000`).

## Fluxo de Autenticação

A maioria dos endpoints exige um JWT no header `Authorization`.

1.  **Login/Register**: Utilize a pasta `Auth/` para se autenticar.
2.  **Gestão de Token**: Após o login, o Bruno está configurado para salvar o `sessionToken` automaticamente em uma variável de ambiente. O `opencollection.yml` usa `mode: bearer` com `token: "{{sessionToken}}"`.

## Grupos de Endpoints

### 1. Sistema e Saúde (`Health`)
- `GET /api/health`: Verificação de status do servidor.

### 2. Autenticação e Perfil (`Auth`, `Users`, `Settings`)
- `POST /api/auth/login` e `POST /api/auth/register`: Fluxo de acesso.
- `GET /api/users/me`: Dados do usuário logado.
- `PATCH /api/users/me`: Atualização de dados pessoais.
- `GET /api/v1/settings/profile`: Perfil completo.
- `PATCH /api/v1/settings/profile`: Atualização de perfil.
- `PATCH /api/v1/settings/change-password`: Alteração de senha.
- `DELETE /api/v1/settings/account`: Exclusão de conta.

### 3. Categorias e Tags (`Categories`, `Tags`)
- `GET /api/v1/categories`: Listagem de categorias.
- `POST /api/v1/categories`: Criação de categoria.
- `PATCH /api/v1/categories/{id}`: Atualização.
- `DELETE /api/v1/categories/{id}`: Remoção.
- `GET /api/v1/tags`: Listagem de tags.
- `POST /api/v1/tags`: Criação de tag.
- `PATCH /api/v1/tags/{id}`: Atualização.
- `DELETE /api/v1/tags/{id}`: Remoção.

### 4. Transações (`Transactions`)
- `GET /api/v1/transactions`: Listagem filtrada de lançamentos.
- `GET /api/v1/transactions/future`: Transações agendadas.
- `GET /api/v1/transactions/{id}`: Detalhe de uma transação.
- `POST /api/v1/transactions`: Cadastro de despesas/receitas.
- `PATCH /api/v1/transactions/{id}`: Atualização.
- `DELETE /api/v1/transactions/{id}`: Soft-delete.

### 5. Orçamentos (`Budgets`)
- `GET /api/v1/budgets`: Listagem com itens e status derivado das transações.
- `POST /api/v1/budgets`: Criação de orçamento com itens.
- `PATCH /api/v1/budgets/{id}`: Atualização.
- `DELETE /api/v1/budgets/{id}`: Remoção.

> **Nota:** os valores de cada item são calculados em tempo real a partir das transações vinculadas. Não há campo `amount` fixo nos itens.

### 6. Veículos (`Vehicles`)
- `GET /api/v1/vehicles`: Lista veículos.
- `POST /api/v1/vehicles`: Cria veículo.
- `GET /api/v1/vehicles/{id}`: Detalhe.
- `PATCH /api/v1/vehicles/{id}`: Atualização.
- `DELETE /api/v1/vehicles/{id}`: Remoção.
- `GET /api/v1/vehicles/{id}/refuelings`: Abastecimentos (transações do tipo FUEL).
- `GET /api/v1/vehicles/{id}/expenses-stats`: Estatísticas de gastos.

### 7. Dashboard e Analytics
- `GET /api/v1/dashboard`: Resumo do mês.
- `GET /api/v1/dashboard/monthly-evolution`: Evolução mensal.
- `GET /api/v1/dashboard/category-breakdown`: Breakdown por categoria.
- `GET /api/v1/analytics/annual-evolution`: Evolução anual.

## Endpoints Removidos (Legado)

Os seguintes recursos existiram em versões anteriores mas foram removidos do backend:
- ~~`Accounts`~~ (CRUD, compartilhamento, resumo)
- ~~`Cards`~~ (CRUD, fatura)
- ~~`Transfers`~~ (CRUD de transferências)
- ~~`Calendar`~~ (vencimentos e recebimentos)
- ~~`Transactions/ImportCSV`~~ e ~~`Transactions/ExportCSV`~~

## Nota de Desenvolvimento

Os arquivos da coleção (`.yml` na raiz da pasta de cada recurso) são texto puro e devem ser commitados sempre que um novo endpoint for adicionado ou alterado no backend, mantendo a documentação sincronizada com a implementação.
