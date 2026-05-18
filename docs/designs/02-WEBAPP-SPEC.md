# 02 - Especificação de Webapp e Design System

O Tallyoh Webapp é uma Single Page Application (SPA) moderna focada em gestão financeira, utilizando React 19 e as melhores práticas do ecossistema TanStack para performance e tipagem rigorosa.

> **Nota:** O webapp foi simplificado. Não há mais módulos `/wallet`, `/activity` ou `/planning` separados. O fluxo principal concentra-se em Dashboard, Transações, Orçamentos e Configurações.

## Stack Tecnológica

- **Framework**: React 19
- **Roteamento**: TanStack Router (Type-safe routing)
- **Gerenciamento de Estado**: TanStack Query (Server State)
- **Estilização**: Tailwind CSS v4 + `@tailwindcss/vite`
- **Ícones**: Lucide React
- **Data Fetching**: Fetch API com hooks customizados do TanStack Query.

## Arquitetura de Pastas

- `apps/webapp/src/routes/`: Definição de rotas e componentes de página baseados em arquivo.
- `apps/webapp/src/components/`: Componentes UI compartilhados e reutilizáveis.
- `apps/webapp/src/lib/`: Configurações de clientes (API, QueryClient) e utilitários globais.

## Estrutura de Rotas

O aplicativo é dividido em rotas práticas e diretas:

- `/`: Dashboard principal com resumos, extrato e gráficos.
- `/auth`: Login e Registro.
- `/budgets`: Gestão de orçamentos derivados (CRUD + visão detalhada).
- `/transactions/crud-transactions`: Interface dedicada de criação/edição de transações.
- `/settings`: Configurações de perfil, categorias, privacidade e veículos.
  - `/settings/categories`: CRUD de categorias.
  - `/settings/personal-info`: Dados pessoais.
  - `/settings/data-privacy`: Modo de privacidade.
  - `/settings/vehicles`: Cadastro de frota.

### Rotas removidas (legado)
- ~~`/wallet/accounts`~~ — sistema de contas removido
- ~~`/wallet/cards`~~ — sistema de cartões removido
- ~~`/wallet/vehicles`~~ — veículos migrados para `/settings/vehicles`
- ~~`/activity/transactions`~~ — extrato integrado ao Dashboard
- ~~`/activity/transfers`~~ — transferências removidas
- ~~`/activity/calendar`~~ — calendário não implementado
- ~~`/planning/plans`~~ — metas de longo prazo removidas
- ~~`/planning/reports`~~ — relatórios não implementados

## Navegação

A navegação principal (BottomNav) contém apenas 3 itens:
1. **Dashboard** (`/`) — resumo e extrato
2. **Orçamentos** (`/budgets`) — planejamento financeiro
3. **Config** (`/settings`) — perfil, categorias, privacidade, veículos

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
