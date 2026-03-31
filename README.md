# Mirante

Plataforma de gerenciamento financeiro pessoal baseada em partidas dobradas (double-entry bookkeeping). Controle de contas, transações, cartões, orçamentos, transferências e análise evolutiva de gastos.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Go 1.24 — `net/http` + `pgx/v5` |
| Webapp | React 19 + TanStack Router + TanStack Query + Tailwind |
| Banco | PostgreSQL 18 |
| Migrations | `golang-migrate` |
| Infra | Docker Compose + Caddy + Cloudflare |
| CI/CD | Gitea Actions (act_runner) |

---

## Estrutura do Monorepo

```
apps/
  backend/          → API Go (cmd/api/main.go)
  webapp/           → React SPA
database/
  migrations/       → SQL migrations (golang-migrate)
  seeds/            → dados iniciais
  cmd/migrate/      → binário de migration standalone
.gitea/
  workflows/
    ondev.yml       → CI em pushes para development
    onmain.yml      → CI + build + push de imagens em pushes para main
```

---

## Desenvolvimento Local

### Pré-requisitos

- Go 1.24+
- Node.js 22+
- Docker + Docker Compose
- PostgreSQL rodando na porta **5433** (via Docker)

### Setup

```bash
# 1. Subir o banco
docker compose up -d db

# 2. Copiar variáveis de ambiente
cp apps/backend/.env.example apps/backend/.env

# 3. Rodar migrations
cd apps/backend
go run ./cmd/migrate up   # requer DATABASE_URL no .env

# 4. Backend
go run ./cmd/api

# 5. Webapp (outro terminal)
cd apps/webapp
npm install
npm run dev
```

### Variáveis de ambiente (backend)

```env
PORT=3000
DATABASE_URL=postgres://user:pass@localhost:5433/mirante
JWT_SECRET=sua-chave-secreta
WEBAPP_URL=http://localhost:5173
ENV=development
```

### Migrations

```bash
cd apps/backend

go run ./cmd/migrate up        # aplica pendentes
go run ./cmd/migrate down      # reverte 1
go run ./cmd/migrate version   # versão atual
go run ./cmd/migrate seed      # aplica seeds
```

Para criar uma nova migration, adicionar dois arquivos em `database/migrations/`:

```
000005_nome_da_migration.up.sql
000005_nome_da_migration.down.sql
```

---

## Infraestrutura de Produção

### Visão geral

```
Internet
   │
   ▼
Cloudflare (proxy + TLS)
   │  HTTPS  gitea.nilbyte.com.br
   │  HTTPS  mirante-api.nilbyte.com.br
   │  HTTPS  mirante.nilbyte.com.br
   ▼
VPS (niflheim)
   │
   ▼
Caddy (reverse proxy interno, porta 80/443)
   ├── gitea.nilbyte.com.br       → gitea:3000
   ├── mirante-api.nilbyte.com.br → mirante_backend_prod:3000
   └── mirante.nilbyte.com.br     → mirante_webapp_prod:80
```

### Redes Docker no servidor

O servidor usa redes Docker nomeadas para isolar e conectar os serviços:

| Rede | Propósito |
|------|-----------|
| `nilbyte-git` | Gitea + act_runner (CI) |
| `mirante-internal` | DB + backend + webapp do Mirante |

O **Caddy** está conectado a todas as redes relevantes para fazer o proxy reverso entre elas.

### Por que `gitea:3000` e não `gitea.nilbyte.com.br` no CI

O runner do Gitea Actions roda como container na rede `nilbyte-git`. Dessa rede:

- `gitea:3000` → **acessível** (Docker DNS interno)
- `gitea.nilbyte.com.br` → **inacessível** — o domínio aponta para o IP público via Cloudflare, e o tráfego de dentro da rede Docker não consegue roteamento de volta para o próprio host pelo IP público

Por isso, operações de git (clone, push) no CI usam `gitea.server_url` (que o runner resolve como `http://gitea:3000`) e o docker login/push usa `gitea:3000` com o registry configurado como insecure:

```json
// /etc/docker/daemon.json no runner
{ "insecure-registries": ["gitea:3000"] }
```

### Split DNS — solução recomendada

Para eliminar esse problema permanentemente, configurar o `extra_hosts` no act_runner para que `gitea.nilbyte.com.br` resolva para o gateway da rede interna (`172.20.0.1` — onde o Caddy escuta):

```yaml
# config.yaml do act_runner
container:
  network: nilbyte-git
  extra_hosts:
    - "gitea.nilbyte.com.br:172.20.0.1"
```

Com isso, dentro dos containers do runner, `gitea.nilbyte.com.br` vai direto para o Caddy interno → TLS funciona → `docker login gitea.nilbyte.com.br` passa a funcionar normalmente, sem precisar de registry insecure.

O gateway `172.20.0.1` foi obtido com:

```bash
docker network inspect nilbyte-git | grep Gateway
```

### Docker Hub no CI

O runner não tem acesso ao Docker Hub (`registry-1.docker.io`) porque o DNS externo não funciona dentro dos containers do runner. Duas soluções:

**Opção A — `--network=host` no docker build** (mais simples):
O build usa a rede do host, que tem DNS externo funcionando.

**Opção B — Espelhar imagens base no Gitea** (uma vez, da máquina local):
```bash
docker login gitea.nilbyte.com.br

docker pull alpine:3.19
docker tag alpine:3.19 gitea.nilbyte.com.br/nilbyte-studios/mirante/base/alpine:3.19
docker push gitea.nilbyte.com.br/nilbyte-studios/mirante/base/alpine:3.19

docker pull nginx:alpine
docker tag nginx:alpine gitea.nilbyte.com.br/nilbyte-studios/mirante/base/nginx:alpine
docker push gitea.nilbyte.com.br/nilbyte-studios/mirante/base/nginx:alpine
```

---

## CI/CD

### `ondev.yml` — branch `development`

Roda em todo push para `development`. Valida sem publicar imagens.

| Job | O que faz |
|-----|-----------|
| `build-backend` | `go build -mod=vendor ./...` |
| `build-webapp` | `npm ci && npm run build` |
| `validate-compose` | `docker compose config` nos arquivos de compose |

### `onmain.yml` — branch `main`

Roda em todo push para `main`. Publica imagens no registry do Gitea.

| Job | O que faz |
|-----|-----------|
| `bump-versions` | Incrementa patch em `apps/backend/VERSION` e `apps/webapp/package.json`, commita e cria tags git |
| `build-backend` | Compila binário Go, builda imagem Docker, publica `backend:latest` e `backend:vX.Y.Z` |
| `build-database` | Compila binário `migrate`, builda imagem Docker, publica `database:latest` |
| `build-webapp` | `npm run build`, builda imagem Docker, publica `webapp:latest` e `webapp:vX.Y.Z` |

### Dependências no CI (vendor)

Tanto o backend (`apps/backend/vendor/`) quanto o módulo de database (`database/vendor/`) têm as dependências vendorizadas. O CI usa `go build -mod=vendor` — zero acesso à internet necessário para o build Go.

Para atualizar dependências:

```bash
# Backend
cd apps/backend && GOWORK=off go mod tidy && GOWORK=off go mod vendor

# Database
cd database && GOWORK=off go mod tidy && GOWORK=off go mod vendor
```

---

## Deploy no VPS

O servidor usa um script de orquestração com compose files separados:

```bash
# Subir stack completa
./mirante.sh start

# Parar
./mirante.sh stop

# Puxar novas imagens e reiniciar
./mirante.sh pull && ./mirante.sh restart

# Logs
./mirante.sh logs
```

Os compose files ficam em `apps/mirante/` no servidor:

| Arquivo | Serviço |
|---------|---------|
| `docker-compose.db.yml` | `mirante_db_prod` (PostgreSQL) |
| `docker-compose.backend.yml` | `mirante_migrate_prod` + `mirante_backend_prod` |
| `docker-compose.webapp.yml` | `mirante_webapp_prod` (nginx) |

### Migrations automáticas no deploy

O `docker-compose.backend.yml` inclui um serviço `mirante-migrate` que roda antes do backend:

```yaml
mirante-migrate:
  image: gitea.nilbyte.com.br/nilbyte-studios/mirante/database:latest
  restart: "no"

mirante-backend:
  depends_on:
    mirante-migrate:
      condition: service_completed_successfully
```

Fluxo ao fazer deploy:
1. `./mirante.sh pull` — puxa novas imagens (backend, webapp, database)
2. `./mirante.sh restart` — sobe `mirante-migrate`, espera terminar com sucesso, aí sobe `mirante-backend`

Migrations nunca precisam ser rodadas manualmente no servidor.

### SSH para o Gitea (porta 2222)

O Gitea expõe SSH na porta **2222** (não 22, que é reservada para o SSH do próprio servidor).

```bash
# Clone via SSH
git clone ssh://git@gitea.nilbyte.com.br:2222/nilbyte-studios/mirante.git

# Config no ~/.ssh/config para simplificar
Host gitea.nilbyte.com.br
  Port 2222
  User git
  IdentityFile ~/.ssh/id_ed25519
```

> **Nota:** SSH na porta 2222 **não funciona de dentro da rede Docker** (`nilbyte-git`). O tráfego não consegue rotear do container de volta para o host pelo domínio externo. Por isso o CI usa HTTPS (com token) para todas as operações git.

---

## Convenções

### Commits

Padrão Conventional Commits:

```
feat(backend): adicionar endpoint de exportação CSV
fix(webapp): corrigir cálculo de saldo negativo
chore(ci): atualizar versão do Go no pipeline
```

### Branches

| Branch | Propósito |
|--------|-----------|
| `main` | Produção — CI faz bump de versão e publica imagens |
| `development` | Integração — CI valida build e compose |

### Valores monetários

Sempre em **centavos** (`int64` no Go, `BIGINT` no PostgreSQL). Usar os helpers:

```go
money.ToCents(19.90)   // → 1990
money.ToReais(1990)    // → 19.90
```

### IDs

```sql
id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT
```

### Timestamps

```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

Datas de transação sempre em UTC 12:00 para evitar problemas de fuso horário.
