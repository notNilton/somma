# Personalledger - Webapp

O webapp do Personalledger é a interface web principal para gerenciamento financeiro pessoal, construída com foco em performance, estética premium e usabilidade intuitiva.

## Tecnologias

- **Core**: React 19
- **Routing e Framework**: TanStack Start (SSR/Streaming)
- **Styling**: Tailwind CSS 4 (com componentes personalizados)
- **Icons**: Lucide React
- **State Management**: TanStack Router Loaders, Hooks e TanStack Query

## Funcionalidades Implementadas

- **Dashboard Financeiro**: Visão consolidada de saldo total, receitas, despesas e "Safe-to-Spend".
- **Gestão de Transações**: Listagem detalhada com categorização, filtros e modal de lançamento unificado.
- **Contas e Carteiras**: Visualização de patrimônio líquido e saldos individuais por instituição.
- **Orçamentos (Budgeting)**: Planejamento mensal por categoria com indicadores visuais de progresso e navegação temporal.
- **Metas (Goals)**: Sistema de objetivos financeiros com monitoramento de progresso e prazos.
- **Evolução de Combustível**: Módulo específico para rastreamento de gastos com veículos e histórico de abastecimentos.
- **Configurações**: Personalização de perfil, segurança e preferências de interface (Data e Privacidade).

## Desenvolvimento

Para rodar o webapp localmente como parte do monorepo, utilize os scripts disponibilizados na raiz do projeto:

```bash
# Na raiz do projeto
npm run dev:webapp
```

O servidor de desenvolvimento iniciará em `http://localhost:3400` ou na porta configurada pelo TanStack Start.

## Estrutura de Pastas

- `/src/routes`: Definição de rotas baseadas em arquivos (TanStack Router).
- `/src/components`: Componentes de UI reutilizáveis, modais e layout estrutural.
- `/src/lib`: Configurações de cliente API, utilitários e lógica compartilhada.
- `/src/styles`: Arquivos globais de CSS, definições de tokens e temas.

---

Desenvolvido por nilByte.
