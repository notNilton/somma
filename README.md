# Mirante

Plataforma unificada de Gerenciamento de Orçamento Pessoal baseada no princípio de Partidas Dobradas (Double-Entry Bookkeeping) e estruturada em arquitetura Monorepo via NPM Workspaces.

O produto atua como um Hub Financeiro moderno, oferecendo controle de transações, monitoramento de metas financeiras, planejamento de orçamentos por categoria e análise evolutiva de consumos específicos (como combustíveis e quilometragem).

## Ecossistema do Monorepo

O projeto é dividido em diferentes aplicativos e pacotes compartilhados:

- **apps/webapp**: Interface web principal desenvolvida com React e TanStack (Router, Query). Oferece dashboards interativos, gestão de metas, orçamentos e evolução de gastos.
- **apps/backend**: API desenvolvida em NestJS que processa a lógica de negócio, autenticação JWT, integridade financeira e persistência.
- **packages/database**: Camada de persistência unificada com Prisma ORM e PostgreSQL, exportando tipagens e o cliente Prisma para todo o monorepo.

---

## Como Iniciar

Siga os passos abaixo para configurar e rodar o projeto localmente.

### 1. Instalar Dependências

Na raiz do projeto, instale todas as dependências do monorepo:

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie o arquivo `.env` para o banco de dados baseando-se no arquivo de exemplo disponível no pacote de database:

```bash
cp packages/database/.env.example packages/database/.env
```

### 3. Infraestrutura (Docker)

O projeto utiliza PostgreSQL e Redis. Para iniciar os contêineres em desenvolvimento, execute:

```bash
npm run db:docker:up
```

### 4. Persistência de Dados

Com o banco de dados ativo, aplique as migrações para criar o schema:

```bash
npm run db:migrate
```

### 5. Execução em Desenvolvimento

Para rodar todos os serviços simultaneamente (Backend e Webapp):

```bash
npm run dev
```

---

## Scripts Principais (Root package.json)

A raiz do projeto centraliza os comandos principais para facilitar o fluxo de trabalho:

### Comandos Globais

- `npm run build`: Executa o build de todos os workspaces.
- `npm run dev`: Inicia todos os aplicativos em modo de desenvolvimento simultaneamente.
- `npm run lint`: Valida o padrão de código em todo o monorepo.

### Banco de Dados (packages/database)

- `npm run db:docker:up`: Inicia PostgreSQL e Redis via Docker.
- `npm run db:migrate`: Aplica migrações e atualiza o Prisma Client.
- `npm run db:studio`: Abre a interface visual do Prisma para exploração de dados.

### Aplicativos Individuais

- `npm run dev:backend`: Inicia apenas o servidor NestJS.
- `npm run dev:webapp`: Inicia apenas o servidor de desenvolvimento do frontend.

---

## Documentação e Design

Para detalhes sobre arquitetura, fluxos de sistema e decisões de interface, consulte a pasta de documentação:

- [Project Design e Roadmap](./docs/designs/PROJECT_DESIGN.md)
- [Database Design e Schema](./docs/designs/DATABASE_DESIGN.md)
- [Padrão de UI para Modais](./docs/design/DESIGN_UI_MODAL.md)

## Padrões de Desenvolvimento

O projeto utiliza ferramentas de automação para garantir a qualidade do código:

- **Husky e Lint-Staged**: Validam e formatam o código automaticamente antes de cada commit.
- **TypeScript**: Tipagem estritamente compartilhada entre database, backend e frontend.
- **Conventional Commits**: Padrão obrigatório para mensagens de commit.
