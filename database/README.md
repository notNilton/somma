# Database Layer - Mirante

Este diretório contém toda a lógica de gerenciamento de banco de dados do projeto.

## Estrutura

- `migrations/`: Arquivos SQL de migração (versionamento do esquema).
- `seed.sql`: Script SQL para semear o banco com dados de teste.
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
Para popular o banco com o usuário "Nilton Santos" e dados de teste:
```bash
go run ./database/cmd/migrate seed
```

## Desenvolvimento

Para criar uma nova migration:
1. Crie um arquivo `XXXXXX_nome.up.sql` em `migrations/`.
2. Crie um arquivo `XXXXXX_nome.down.sql` em `migrations/`.
3. Rode `go run ./database/cmd/migrate up`.
