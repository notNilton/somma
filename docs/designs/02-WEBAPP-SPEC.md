# 02 - Especificação de Webapp e Design System

O Mirante Webapp é uma Single Page Application (SPA) moderna focada em gestão financeira, utilizando React 19 e as melhores práticas do ecossistema TanStack para performance e tipagem rigorosa.

## Stack Tecnológica

- **Framework**: React 19
- **Roteamento**: TanStack Router (Type-safe routing)
- **Gerenciamento de Estado**: TanStack Query (Server State) + Zustand (Client State/Auth)
- **Estilização**: Tailwind CSS v4 + `@tailwindcss/vite`
- **Ícones**: Lucide React
- **Data Fetching**: Axios ou Fetch API com hooks customizados do TanStack Query.

## Arquitetura de Pastas

- `apps/webapp/src/routes/`: Definição de rotas e componentes de página baseados em arquivo.
- `apps/webapp/src/components/`: Componentes UI compartilhados e reutilizáveis.
- `apps/webapp/src/hooks/`: Hooks customizados para lógica de domínio e integração com API.
- `apps/webapp/src/store/`: Stores Zustand para autenticação e preferências (ex: `privacy-mode`).
- `apps/webapp/src/lib/`: Configurações de clientes (API, QueryClient) e utilitários globais.

## Estrutura de Rotas

O aplicativo é dividido em grandes módulos lógicos:

- `/`: Dashboard principal com resumos e gráficos.
- `/auth`: Login e Registro.
- `/wallet`: Gestão de ativos financeiros.
    - `/wallet/accounts`: CRUD de contas bancárias e carteiras.
    - `/wallet/cards`: Gestão de cartões de crédito/débito.
    - `/wallet/vehicles`: Cadastro de frota pessoal.
- `/activity`: Movimentações do dia a dia.
    - `/activity/transactions`: Extrato completo, filtros e CRUD de lançamentos.
    - `/activity/transfers`: Registro de transferências entre contas.
    - `/activity/calendar`: Visão mensal de vencimentos.
- `/planning`: Planejamento futuro.
    - `/planning/budgets`: Definição de orçamentos mensais por categoria.
    - `/planning/plans`: Metas de longo prazo e sonhos.
    - `/planning/reports`: Relatórios de evolução e análise de gastos.
- `/settings`: Configurações de perfil, categorias e privacidade.

## Princípios de Design

1. **Privacy First**: Modo de "privacidade" (blur em valores financeiros) ativado facilmente na UI para uso em locais públicos.
2. **Mobile-First UX**: Interface otimizada para inserção rápida de transações em dispositivos móveis.
3. **Feedback Visual**: Uso intensivo de cores para indicar status financeiro (ex: orçamento estourado, saldo negativo).
4. **Performance**: Mínimo de rerenders e cache agressivo de dados do servidor via TanStack Query.

## Desenvolvimento

- **Executar**: `cd apps/webapp && npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Padrão de Código**: Componentes funcionais com TypeScript e hooks.
