# Mirante - Backend API

Esta é a API central para a plataforma Mirante, desenvolvida com NestJS.

O Backend é o motor de processamento da plataforma, responsável pela lógica de negócio, controle de integridade financeira e segurança dos dados contábeis.

## Arquitetura Backend

O Backend atua como a única ponte autorizada para manipular os dados do sistema. Ele gerencia a comunicação importando o módulo `@mirante/database` derivado do monorepo.

### Princípios Técnicos

1.  **Partidas Dobradas (Double-Entry Bookkeeping)**: Modificações financeiras utilizam roteamento rigoroso para criar correspondência exata de ativos, passivos, origens e destinos da transação.
2.  **Autenticação JWT**: Gerenciamento de sessões e segurança via tokens JWT para acesso aos recursos protegidos.
3.  **Carga Massiva e Performance**: Preparado para processamento assíncrono e importação de dados através de filas lógicas.
4.  **Trilhas de Auditoria**: Registro de modificações fundamentais para rastreabilidade e integridade histórica.

## Estrutura e Domínios da API

A estrutura lógica do projeto segue a segmentação de domínios especificados no planejamento:

- **/users**: Gestão de perfil, preferências e níveis de acesso.
- **/accounts**: Gestão de portfólio (Carteiras, Investimentos, Conta Corrente, Poupança).
- **/transactions & /transfers**: Processamento de lançamentos, transferências e fluxos contábeis.
- **/budgets**: Motor de planejamento orçamentário mensal.
- **/goals**: Gestão de metas financeiras e alocação de capital.
- **/vehicles**: Módulo para controle de frotas e automação de abastecimentos.

## Padrões de Código

- **DTOs (Data Transfer Objects)**: Uso estrito de DTOs tipados com validação automática via Class Validator.
- **Soft Deletions**: O sistema utiliza deleção lógica (`is_active` e `deleted_at`) para preservar o histórico analítico.
- **Service Layer**: Lógica de negócio encapsulada em serviços, mantendo os controllers limpos e focados no roteamento.

## Desenvolvimento

Como este pacote faz parte de um workspace do NPM, recomenda-se executar os comandos a partir da raiz do monorepo:

```bash
# Iniciar backend em watch mode (via root)
npm run dev:backend

# Build do backend
npm run build:backend
```

Para detalhes adicionais de infraestrutura, consulte o README principal na raiz do monorepo ou os documentos de arquitetura em `docs/designs/`.
