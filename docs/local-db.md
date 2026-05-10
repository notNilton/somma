# Desenvolvimento Local

## Subir tudo

Na raiz do projeto:

```bash
make up
```

Isso sobe o PostgreSQL local, cria `apps/backend/.env` se ele ainda nao existir, aplica migrations e inicia backend + webapp.

URLs padrao:

```text
Backend: http://localhost:3000
Webapp:  http://localhost:3400
DB:      localhost:5454
```

## Subir apenas dependencias locais

```bash
make deps-up
```

Hoje a dependencia local usada pelo app e o PostgreSQL. MinIO fica disponivel como alvo opcional para quando o projeto passar a consumir storage S3:

```bash
ENABLE_MINIO=1 make deps-up
```

## Conexão local

O banco sobe com estes valores padrão:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=personalledger
POSTGRES_PORT=5454
```

Logo, a `DATABASE_URL` local fica:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5454/personalledger?sslmode=disable
```

Isso já bate com [apps/backend/.env.example](/var/home/notNilton/Workspace/nilbyte/personalledger/apps/backend/.env.example).

## Rodar migrations

Com o banco local já no ar:

```bash
make migrate-up
```

Ver versão atual:

```bash
make migrate-version
```

Voltar uma migration:

```bash
make migrate-down
```

Recriar banco local do zero:

```bash
make db-reset
```

## Rodar seed

Para popular o banco com dados iniciais completos:

```bash
make seed
```

`make seed` é um atalho para `make seed-complete`.

O seed SQL usado hoje está em [database/seeds/initial_seed.sql](/var/home/notNilton/Workspace/nilbyte/personalledger/database/seeds/initial_seed.sql).

Para um banco minimalista com usuario, contas e veiculo:

```bash
make seed-barebones
```

## Fluxo recomendado para testar localmente do zero

```bash
make deps-reset
make env
make migrate-up
make seed
make dev
```

## Criar novas migrations

Adicione dois arquivos em `database/migrations/`:

```text
000007_nome_da_migration.up.sql
000007_nome_da_migration.down.sql
```

Depois aplique:

```bash
make migrate-up
```
