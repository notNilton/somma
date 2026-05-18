# Database Layer - Tallyoh

Este diretório contém toda a lógica de gerenciamento de banco de dados do projeto.

## Estrutura

- `migrations/`: Arquivos SQL de migração (versionamento do esquema).
- `seeds/`: Scripts SQL para semear o banco com dados de teste (ex: `initial_seed.sql`).
- `cmd/migrate/`: Ferramenta em Go para aplicar migrations e seeds.
- `database.go`: Conector central para o PostgreSQL.

## Como Usar

### Migrations
Para evoluir o banco de dados:
```bash
go run ./database/cmd/migrate up
```

Para retroceder uma versão:
```bash
go run ./database/cmd/migrate down
```

### Seeding
Para popular o banco com o cenário completo, incluindo transações:
```bash
go run ./database/cmd/migrate seed-complete
```

Para popular apenas o cenário mínimo com usuário, contas e veículo:
```bash
go run ./database/cmd/migrate seed-barebones
```

No `Makefile`, `make seed` é um atalho para o seed completo.

## Desenvolvimento

Para criar uma nova migration:
1. Crie um arquivo `XXXXXX_nome.up.sql` em `migrations/`.
2. Crie um arquivo `XXXXXX_nome.down.sql` em `migrations/`.
3. Rode `go run ./database/cmd/migrate up`.
