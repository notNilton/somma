# tally'oh

Personal finance tracker built around a simple income/expense model with kinds (income, expense, credit, saving, budget). Transactions drive everything — budgets are envelope limits, spending is derived from linked transactions.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go — `net/http` + `pgx/v5` |
| Web | React 19 + React Router v7 + TanStack Query + Vite |
| Database | PostgreSQL |
| Migrations | Custom Go migrate tool (`database/cmd/migrate`) |
| Infra | Docker Compose + Caddy + Cloudflare |
| CI/CD | Gitea Actions (act_runner) |

---

## Monorepo Structure

```
apps/
  backend/          → Go API (apps/backend/cmd/api/main.go)
  web/              → React frontend (Vite, port 3400)
  doc/              → OpenAPI spec + Bruno collection
database/
  migrations/       → SQL migrations (sequential, named)
  seeds/            → initial data scripts
  cmd/migrate/      → standalone migration binary
.gitea/
  workflows/
    pull_request.yml → CI on pull requests (build + compose validation)
    onmain.yml       → CI + image build + push + version bump on main
```

---

## Local Development

### Prerequisites

- Go 1.24+
- Node.js 22+
- Docker or Podman

### Quickstart

```bash
make up
```

Starts PostgreSQL, runs migrations, seeds data, and launches the backend. Run `make web` separately for the frontend dev server.

### Environment Variables (backend)

```env
PORT=3300
DATABASE_URL=postgresql://postgres:postgres@localhost:5454/tallyoh?sslmode=disable
JWT_SECRET=your-secret-key
WEBAPP_URL=http://localhost:3400
ENV=development
```

### Migrations

```bash
make migrate-up        # apply pending migrations
make migrate-down      # revert one migration
make migrate-version   # show current version
make db-seed-complete  # apply full seed with transactions
make db-seed-barebones # apply minimal seed (user only)
```

To create a new migration, add two files under `database/migrations/`:

```
000021_description.up.sql
000021_description.down.sql
```

---

## Transaction Model

Every transaction has a `type` and a `kind`:

| Field | Values |
|-------|--------|
| `type` | `INCOME` \| `EXPENSE` |
| `kind` | `INCOME` \| `EXPENSE` \| `SAVING` \| `CREDIT` \| `BUDGET` |

`kind` refines `type`: savings, credit payments, and budget allocations are all expense-type but tracked separately. Budgets have an `allocated_amount_cents` cap; spending is summed from linked transactions.

---

## Production Infrastructure

### Overview

```
Internet
   │
   ▼
Cloudflare  ←  *.nilbyte.com.br DNS
   │  Tunnel (cloudflared) — HTTP/HTTPS only
   │  TLS terminates at Cloudflare
   ▼
VPS niflheim (Ubuntu)
   │
   ▼
Caddy (container, http:// only — no own certificates)
   ├── gitea.nilbyte.com.br         → gitea:3000
   ├── api.tallyoh.nilbyte.com.br   → tallyoh_backend_prod:3300
   └── tallyoh.nilbyte.com.br       → tallyoh_web_prod:80
```

Traffic enters via **Cloudflare Tunnel** — no ports exposed directly to the internet. Cloudflare terminates TLS and forwards plain HTTP to Caddy.

**Important:** Cloudflare only routes HTTP/HTTPS. Any other protocol (raw SSH, TCP) is silently dropped before reaching the server.

### Docker Networks

| Network | Purpose |
|---------|---------|
| `nilbyte-git` | Gitea + act_runner (CI) |
| `tallyoh-internal` | DB + backend + web |

Caddy is attached to all networks for reverse proxying.

### Why `gitea:3000` instead of `gitea.nilbyte.com.br` in CI

The Gitea Actions runner runs as a container on the `nilbyte-git` network. From there:

- `gitea:3000` → **accessible** via Docker internal DNS
- `gitea.nilbyte.com.br` → **inaccessible** — the domain resolves through the Cloudflare Tunnel, which is external; the container cannot route back to the host via the public IP

CI uses `gitea:3000` for docker login/push, with the daemon configured to allow insecure HTTP:

```json
{ "insecure-registries": ["gitea:3000"] }
```

### SSH Access (port 2222)

Gitea exposes SSH on port **2222**. SSH does not go through Cloudflare.

**From the same server / CI containers:**
```bash
ssh://git@gitea:22/nilByte/tallyoh.git
```

**From an external machine via Tailscale (recommended):**
```bash
git clone ssh://git@niflhel:2222/nilByte/tallyoh.git
ssh -T git@niflhel -p 2222
```

```
# ~/.ssh/config
Host gitea
  HostName niflhel
  Port 2222
  User git
  IdentityFile ~/.ssh/id_ed25519
```

**Without Tailscale:** not possible. `gitea.nilbyte.com.br:2222` hits Cloudflare which drops TCP silently. Use HTTPS + token for git operations instead.

---

## CI/CD

### `pull_request.yml` — Pull Requests

Runs on every PR. Validates without publishing images.

| Job | What it does |
|-----|-------------|
| `detect-changes` | Identifies which areas changed |
| `build-backend` | `go build -mod=vendor ./...` |
| `build-database` | `go build -mod=vendor ./...` on the migrations module |
| `validate-compose` | `docker compose config` on compose files |

### `onmain.yml` — `main` branch

Runs on every push to `main`. Detects changed areas, builds and pushes Docker images, then bumps the patch version of the affected service.

| Job | What it does |
|-----|-------------|
| `build-backend` | Builds Go binary, pushes `backend:latest` + `backend:vX.Y.Z`, bumps `apps/backend/VERSION` |
| `build-web` | Builds Vite bundle, pushes `web:latest` + `web:vX.Y.Z`, bumps version in `apps/web/package.json` |
| `build-doc` | Builds doc image, pushes `doc:latest` + `doc:vX.Y.Z`, bumps `apps/doc/VERSION` |

Version bump commits are tagged `[skip ci]` to avoid infinite loops.

### Vendored Dependencies

Both the backend (`apps/backend/vendor/`) and database module (`database/vendor/`) vendor their dependencies. CI uses `go build -mod=vendor` — no internet access required for Go builds.

To update dependencies:

```bash
# Backend
cd apps/backend && GOWORK=off go mod tidy && GOWORK=off go mod vendor

# Database
cd database && GOWORK=off go mod tidy && GOWORK=off go mod vendor
```

---

## Conventions

### Commits

Conventional Commits:

```
feat(backend): add annual analytics endpoint
fix(web): correct negative balance calculation
chore(ci): update Go version in pipeline
```

### Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production — CI bumps version and publishes images |
| `development` | Integration — CI validates build and compose |

### Monetary Values

Always stored in **cents** (`int64` in Go, `BIGINT` in PostgreSQL):

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

Transaction dates are stored at UTC 12:00 to avoid timezone edge cases.
