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
- [Air](https://github.com/air-verse/air) (para hot-reload no Go)

### Setup

```bash
# 1. Subir o banco
docker compose up -d db

# 2. Copiar variáveis de ambiente
cp apps/backend/.env.example apps/backend/.env

# 3. Rodar migrations
cd apps/backend
go run ./cmd/migrate up   # requer DATABASE_URL no .env

# 4. Backend (com hot-reload via air)
air

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
Cloudflare  ←  *.nilbyte.com.br DNS aponta aqui
   │  Tunnel (cloudflared) — apenas HTTP/HTTPS
   │  TLS termina no Cloudflare
   ▼
VPS niflheim (Ubuntu)
   │
   ▼
Caddy (container, http:// apenas — sem certificados próprios)
   ├── gitea.nilbyte.com.br         → gitea:3000
   ├── mirante-api.nilbyte.com.br   → mirante_backend_prod:3000
   └── mirante.nilbyte.com.br       → mirante_webapp_prod:80
```

O tráfego externo entra via **Cloudflare Tunnel** (`cloudflared` rodando no servidor), não por portas abertas diretamente na internet. O Cloudflare termina TLS e envia HTTP para o Caddy internamente. Por isso o Caddy usa blocos `http://` no Caddyfile — ele nunca precisa de certificados.

**Consequência importante:** Cloudflare só roteia HTTP/HTTPS. Qualquer outro protocolo (SSH, TCP raw) é bloqueado silenciosamente antes de chegar ao servidor.

### Redes Docker no servidor

| Rede | Propósito |
|------|-----------|
| `nilbyte-git` | Gitea + act_runner (CI) |
| `mirante-internal` | DB + backend + webapp do Mirante |

O **Caddy** está conectado a todas as redes para fazer o proxy reverso. O gateway da rede `nilbyte-git` é `172.20.0.1`.

### Por que `gitea:3000` e não `gitea.nilbyte.com.br` no CI

O runner do Gitea Actions roda como container na rede `nilbyte-git`. Dessa rede:

- `gitea:3000` → **acessível** via Docker DNS interno
- `gitea.nilbyte.com.br` → **inacessível** — o domínio vai para o Cloudflare Tunnel, que é externo; o container não consegue rotear de volta para o próprio host pelo IP público

Por isso, o docker login/push no CI usa `gitea:3000` com o daemon configurado para aceitar registry HTTP insecure:

```json
// configurado em runtime no CI antes do docker login
{ "insecure-registries": ["gitea:3000"] }
```

### Por que `--network=host` nos docker builds

Os containers de build (`docker build`) herdam o DNS isolado da rede `nilbyte-git`, que não resolve domínios externos como `registry-1.docker.io` (Docker Hub). Com `--network=host`, o build usa a rede do host do VPS, que tem DNS externo funcionando normalmente — permitindo puxar `alpine`, `golang`, `node`, `nginx` etc.

### Split DNS — melhoria futura opcional

Para que `gitea.nilbyte.com.br` resolva corretamente de dentro dos containers do runner (sem precisar de insecure registry), configurar `extra_hosts` no act_runner:

```yaml
# config.yaml do act_runner
container:
  network: nilbyte-git
  extra_hosts:
    - "gitea.nilbyte.com.br:172.20.0.1"
```

Com isso, `gitea.nilbyte.com.br` aponta para `172.20.0.1` (gateway → Caddy) dentro dos containers. O Caddy faz o proxy para `gitea:3000`. Docker login passaria a funcionar com o domínio real, sem precisar de insecure registry.

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

O Gitea expõe SSH na porta **2222**. O SSH **não passa pelo Cloudflare** — o Cloudflare Tunnel só roteia HTTP/HTTPS. Dependendo de onde você está:

#### Do próprio servidor / CI (containers na rede `nilbyte-git`)

O Gitea é acessível diretamente pelo nome do container. A porta interna do container é 22:

```bash
ssh://git@gitea:22/nilbyte-studios/mirante.git
```

Ou via `localhost` se rodar fora de container no próprio host:

```bash
ssh://git@localhost:2222/nilbyte-studios/mirante.git
```

#### De uma máquina externa com Tailscale (recomendado)

O servidor está na VPN Tailscale com o hostname `niflhel`. O tráfego vai direto pelo túnel VPN, contornando o Cloudflare:

```bash
git clone ssh://git@niflhel:2222/nilbyte-studios/mirante.git

# Testar conexão
ssh -T git@niflhel -p 2222
# Resposta esperada: Hi there, <user>! You've successfully authenticated...
```

```
# ~/.ssh/config
Host gitea
  HostName niflhel
  Port 2222
  User git
  IdentityFile ~/.ssh/id_ed25519
```

#### De uma máquina externa sem Tailscale

Não funciona. O domínio `gitea.nilbyte.com.br:2222` vai para o Cloudflare, que descarta o TCP silenciosamente. Alternativa: usar HTTPS com token para operações git.

> O CI (`bump-versions`) usa HTTPS com `PACKAGES_TOKEN` para push de volta ao repositório — não depende de SSH externo.

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
