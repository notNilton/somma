# Mirante - Database Package (@mirante/database)

Este pacote é a fonte única de verdade (Single Source of Truth) para o esquema do banco de dados, orquestração de infraestrutura e tipagens exportadas para todo o monorepo.

Utilizamos o Prisma ORM como motor de persistência e relacionamento sob um banco de dados PostgreSQL.

## Responsabilidades do Pacote

- **Modelagem Centralizada**: Manutenção das tabelas relacionais baseadas na lógica de partidas dobradas.
- **Tipagem Automática Estrita**: Exportação de modelos e enums gerados pelo Prisma para consumo nos outros aplicativos da workspace.
- **Mapeamento Snake_Case**: Enquanto a aplicação utiliza camelCase, o esquema físico do banco de dados é estritamente mapeado em snake_case via drivers do Prisma.
- **Orquestração de Contêineres**: Configuração de infraestrutura local (PostgreSQL e Redis) via Docker Compose.

---

## Comandos de Desenvolvimento

Os comandos abaixo devem ser executados através dos atalhos configurados na raiz do monorepo para garantir a consistência de variáveis de ambiente.

### Gerenciamento de Infraestrutura

```bash
npm run db:docker:up    # Inicia os contêineres PostgreSQL e Redis
npm run db:docker:down  # Encerra os contêineres e limpa recursos
```

### Manipulação do Banco (Prisma)

- **npm run db:migrate**: Sincroniza o esquema local com o banco de dados e gera o Prisma Client. Este comando cria novas migrações históricas.
- **npm run db:generate**: Atualiza as tipagens do Prisma Client sem alterar o esquema do banco de dados.
- **npm run db:studio**: Inicia a interface gráfica para exploração e manipulação manual dos dados.
- **npm run db:seed**: Executa scripts de povoamento inicial do banco para desenvolvimento.

## Integração no Monorepo

Para acessar o banco de dados em outros pacotes da workspace, importe o cliente e as tipagens diretamente:

```typescript
import { PrismaClient, TransactionStatus } from '@mirante/database';

const prisma = new PrismaClient();
```

As tipagens refletem automaticamente qualquer alteração realizada no `schema.prisma` deste pacote após a execução do comando de geração.
