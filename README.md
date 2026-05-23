# Tallyoh

Plataforma de gerenciamento financeiro pessoal baseada em partidas dobradas (double-entry bookkeeping). Controle de transações, categorias, orçamentos derivados, veículos e análise evolutiva de gastos.

> **Arquitetura enxuta:** contas bancárias, cartões, transferências e planejamento de metas de longo prazo foram removidos para manter o core simplificado. Orçamentos são derivados diretamente das transações vinculadas.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Go 1.25 — `net/http` + `pgx/v5` |
| Webapp | React 19 + TanStack Router + TanStack Query + Tailwind |
| Banco | PostgreSQL 18 |
| Migrations | `golang-migrate` |
| Infra | Docker Compose + Caddy + Cloudflare |
| CI/CD | Gitea Actions (act_runner) |

---

## Estrutura do Monorepo

```
app/                → API Go (app/cmd/api/main.go)
database/
  migrations/       → SQL migrations (golang-migrate)
  seeds/            → dados iniciais
  cmd/migrate/      → binário de migration standalone
doc/                → coleção Bruno (documentação e testes da API)
.gitea/
  workflows/
    pull_request.yml → CI em pull requests (valida build e compose)
    onmain.yml      → CI + build + push de imagens em pushes para main
```

---

## Desenvolvimento Local

### Pré-requisitos

- Go 1.24+
- Node.js 22+
- Docker ou Podman
- [Air](https://github.com/air-verse/air) (opcional, para hot-reload no Go)

### Setup

```bash
make up
```

O `make up` sobe o PostgreSQL local, cria `app/.env` quando necessário, aplica migrations e inicia o backend.

### Variáveis de ambiente (backend)

```env
PORT=3300
DATABASE_URL=postgresql://postgres:postgres@localhost:5454/tallyoh?sslmode=disable
JWT_SECRET=sua-chave-secreta
WEBAPP_URL=http://localhost:3400
ENV=development
```

### Migrations

```bash
make migrate-up        # aplica pendentes
make migrate-down      # reverte 1
make migrate-version   # versão atual
make seed-complete     # aplica o seed completo
make seed-barebones    # aplica o seed básico
```

Para um fluxo isolado só de banco local, use `make deps-up`, `make db-reset` e os alvos de migration.

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
   ├── api.tallyoh.nilbyte.com.br   → tallyoh_backend_prod:3300
   └── tallyoh.nilbyte.com.br       → tallyoh_webapp_prod:80
```

O tráfego externo entra via **Cloudflare Tunnel** (`cloudflared` rodando no servidor), não por portas abertas diretamente na internet. O Cloudflare termina TLS e envia HTTP para o Caddy internamente. Por isso o Caddy usa blocos `http://` no Caddyfile — ele nunca precisa de certificados.

**Consequência importante:** Cloudflare só roteia HTTP/HTTPS. Qualquer outro protocolo (SSH, TCP raw) é bloqueado silenciosamente antes de chegar ao servidor.

### Redes Docker no servidor

| Rede | Propósito |
|------|-----------|
| `nilbyte-git` | Gitea + act_runner (CI) |
| `tallyoh-internal` | DB + backend + webapp do Tallyoh |

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

### `pull_request.yml` — Pull Requests

Roda em todo PR. Valida sem publicar imagens.

| Job | O que faz |
|-----|-----------|
| `detect-changes` | Identifica quais áreas mudaram |
| `build-backend` | `go build -mod=vendor ./...` |
| `build-database` | `go build -mod=vendor ./...` no módulo de migrations |
| `validate-compose` | `docker compose config` nos arquivos de compose |

### `onmain.yml` — branch `main`

Roda em todo push para `main`. Detecta quais áreas mudaram, bumpa versão só do que foi afetado e publica imagens no registry do Gitea.

| Job | O que faz |
|-----|-----------|
| `detect-changes` | Roda no runner `basic` e identifica se backend, database, webapp ou workflows mudou no commit atual |
| `bump-versions` | Incrementa a versão em `app/VERSION`, commita e cria tag git |
| `build-backend` | Compila binário Go, reaproveita cache de camadas Docker e publica `backend:latest` e `backend:vX.Y.Z` |
| `update-database` | Gera e publica `database:latest` quando migrations/seed mudam |
| `deploy` | Conecta por SSH e executa `docker compose pull` + `up -d` no VPS quando ao menos um build terminou com sucesso |

### Dependências no CI (vendor)

Tanto o backend (`app/vendor/`) quanto o módulo de database (`database/vendor/`) têm as dependências vendorizadas. O CI usa `go build -mod=vendor` — zero acesso à internet necessário para o build Go.

Para atualizar dependências:

```bash
# Backend
cd app && GOWORK=off go mod tidy && GOWORK=off go mod vendor

# Database
cd database && GOWORK=off go mod tidy && GOWORK=off go mod vendor
```

---

## Deploy no VPS

O servidor usa um script de orquestração com compose files separados:

```bash
# Subir stack completa
./tallyoh.sh start

# Parar
./tallyoh.sh stop

# Puxar novas imagens e reiniciar
./tallyoh.sh pull && ./tallyoh.sh restart

# Logs
./tallyoh.sh logs
```

Os compose files ficam em `apps/tallyoh/` no servidor:

| Arquivo | Serviço |
|---------|---------|
| `docker-compose.db.yml` | `tallyoh_db_prod` (PostgreSQL) |
| `docker-compose.backend.yml` | `tallyoh_migrate_prod` + `tallyoh_backend_prod` |
| `docker-compose.webapp.yml` | `tallyoh_webapp_prod` (nginx) |

### Migrations automáticas no deploy

O `docker-compose.backend.yml` inclui um serviço `tallyoh-migrate` que roda antes do backend:

```yaml
tallyoh-migrate:
  image: gitea.nilbyte.com.br/nilByte/tallyoh/database:latest
  restart: "no"

tallyoh-backend:
  depends_on:
    tallyoh-migrate:
      condition: service_completed_successfully
```

Fluxo ao fazer deploy:
1. `./tallyoh.sh pull` — puxa novas imagens (backend, webapp, database)
2. `./tallyoh.sh restart` — sobe `tallyoh-migrate`, espera terminar com sucesso, aí sobe `tallyoh-backend`

Migrations nunca precisam ser rodadas manualmente no servidor.

### SSH para o Gitea (porta 2222)

O Gitea expõe SSH na porta **2222**. O SSH **não passa pelo Cloudflare** — o Cloudflare Tunnel só roteia HTTP/HTTPS. Dependendo de onde você está:

#### Do próprio servidor / CI (containers na rede `nilbyte-git`)

O Gitea é acessível diretamente pelo nome do container. A porta interna do container é 22:

```bash
ssh://git@gitea:22/nilByte/tallyoh.git
```

Ou via `localhost` se rodar fora de container no próprio host:

```bash
ssh://git@localhost:2222/nilByte/tallyoh.git
```

#### De uma máquina externa com Tailscale (recomendado)

O servidor está na VPN Tailscale com o hostname `niflhel`. O tráfego vai direto pelo túnel VPN, contornando o Cloudflare:

```bash
git clone ssh://git@niflhel:2222/nilByte/tallyoh.git

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
feat(backend): adicionar endpoint de analytics anual
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
