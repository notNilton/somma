# 03 - Especificação de API Client (Bruno)

O diretório `client-api/` contém uma coleção do [Bruno](https://www.usebruno.com/) para interação direta com o backend do Mirante. Esta coleção é fundamental para testes de API, depuração e documentação viva do contrato de endpoints.

## Pré-requisitos

1.  **Instalar Bruno**: [Download em usebruno.com](https://www.usebruno.com/downloads).
2.  **Abrir Coleção**: No Bruno, clique em "Open Collection" e selecione a pasta `client-api`.
3.  **Ambiente**: Utilize o ambiente `environments/Development.yml` para configurar a `base_url` (padrão: `http://localhost:3000/api`).

## Fluxo de Autenticação

A maioria dos endpoints exige um JWT no header `Authorization`.

1.  **Login/Register**: Utilize a pasta `Auth/` para se autenticar.
2.  **Gestão de Token**: Após o login, o Bruno está configurado para salvar o `token` automaticamente em uma variável de ambiente ou coleção. Verifique se o header de `Authorization: Bearer {{token}}` está ativo nos endpoints.

## Grupos de Endpoints

### 1. Sistema e Saúde (`Health`, `Dashboard`)
- `GET /health`: Verificação de status do servidor.
- `GET /api/dashboard/monthly-evolution`: Dados de gráficos evolutivos.
- `GET /api/dashboard/category-breakdown`: Resumo de gastos por categoria.

### 2. Autenticação e Perfil (`Auth`, `Users`, `Settings`)
- `POST /api/login` e `POST /api/register`: Fluxo de acesso.
- `GET /api/users/me`: Dados do usuário logado.
- `PUT /api/settings/profile`: Atualização de dados pessoais e senhas.

### 3. Carteira e Ativos (`Accounts`, `Cards`, `Vehicles`)
- `GET/POST /api/accounts`: Gestão de contas bancárias.
- `GET/POST /api/cards`: Controle de cartões de crédito.
- `GET/POST /api/vehicles`: Cadastro de veículos e frotas.

### 4. Atividades e Lançamentos (`Transactions`, `Transfers`, `Calendar`)
- `GET /api/transactions`: Listagem filtrada de lançamentos.
- `POST /api/transactions`: Cadastro de despesas/receitas.
- `POST /api/transfers`: Registro de transferências.
- `POST /api/transactions/import-csv`: Endpoint de ingestão massiva.

### 5. Planejamento (`Budgets`, `Tags`, `Categories`)
- `GET /api/budgets/status`: Acompanhamento de metas mensais.
- `GET /api/categories`: Listagem de categorias cadastradas.
- `GET /api/tags`: Gestão de etiquetas personalizadas.

## Nota de Desenvolvimento
Os arquivos da coleção (`.yml` na raiz da pasta de cada recurso) são texto puro e devem ser commitados sempre que um novo endpoint for adicionado ou alterado no backend, mantendo a documentação sincronizada com a implementação.
