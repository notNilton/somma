# CI/CD — Gitea Actions

Continuous integration and continuous delivery pipeline for Somma, running on `act_runner` hosted on the `niflheim` VPS.

---

# Gitea Runner Pools

This repository uses separate runners per workload to prevent application builds from competing for resources on the same host.

## Host Context (VPS Niflheim)

- 4 vCPUs / 8 GB RAM
- Gitea and production stack running on the same host.
- Runners are configured to limit server impact, prioritizing production service stability over CI speed.

## Topology

- `basic`: Change detection, version bump/tag, and lightweight infrastructure validations.
- `go`: Go Backend and Migrations.
- `basic`: SSH deployment.
- `typescript`: React Webapp, Vite, and other Node.js tools.

## Operational Limits

- `go`: `mem_limit: 1024m`, `cpu_shares: 96`.
- `typescript`: `mem_limit: 2048m`, `cpu_shares: 160`.
- Both have `capacity: 1` and `oom_score_adj: 500`.
- Runners do not have fixed CPU limits to allow bursts when host resources are available.

## How the Workflow Chooses a Runner

The selector is the `runs-on` property of the job.

### Go Backend / Infra

```yaml
jobs:
  build:
    runs-on: go
```

### Basic / Lightweight Automations

```yaml
jobs:
  detect-changes:
    runs-on: basic
```

### Deploy / SSH

```yaml
jobs:
  deploy:
    runs-on: basic
```

### TypeScript / React Webapp

```yaml
jobs:
  build:
    runs-on: typescript
```

## What to Avoid

- **Do not use `ubuntu-latest`** as a generic label.
- **Do not use `react`** (deprecated label; use `typescript`).
- Do not manually install heavy toolchains if the runner image already provides them.

## Toolchain Setup

Runner images already include primary toolchains (`go`, `node`, `npm`).

Use `actions/setup-go` or `actions/setup-node` only when you need to:
- Pin a specific version different from the pre-installed one.
- Use native action caching.
- Test across multiple versions.

---

## Operations (Explicit Deploy)

Deploying to the VPS is an explicit job in the pipeline:
1. The pipeline pushes images tagged with `:latest`.
2. A `deploy` job connects via SSH to the VPS using the `deploy` user.
3. The VPS executes `docker compose pull` and `up -d` from the infrastructure checkout located at `/srv/nilbyte/infrastructure`.

## Selective Execution

Primary workflows no longer build everything on every execution:

- `onmain.yml` detects backend/database/webapp changes separately, only performing bump/build/push for changed components. Changes under `.gitea/workflows/**` force a full build set.
- `pull_request.yml` validates backend/database/webapp separately and skips unaffected jobs.

### Caching Used in Jobs

- Docker uses `--cache-from` referencing the `:latest` image published in the registry.
- Webapp uses npm local cache via `npm ci --cache /tmp/npm-cache --prefer-offline`.
- Backend/database use `GOCACHE` and `GOMODCACHE` under `/tmp` to reduce re-compilations when runners reuse state.

---

## Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ondev.yml` | push to `development` | Validates that code compiles and builds |
| `onmain.yml` | push to `main` | Version bump + build + push images to registry |

---

## `ondev.yml` — `development` branch

Runs in parallel without publishing artifacts. Goal: early detection of breakage.

```
push → development
         │
         ├── build-backend    (go build -mod=vendor)
         ├── build-webapp     (npm ci + npm run build)
         └── validate-compose (docker compose config)
```

### Jobs

#### `build-backend`
1. Clones the repository via HTTPS with `PACKAGES_TOKEN`
2. Uses the pre-installed Go toolchain on the runner
3. Compiles with `go build -mod=vendor ./...` — uses `apps/backend/vendor/`, zero internet access needed

#### `build-webapp`
1. Clones the repository
2. `npm ci` + `npm run build` — uses pre-installed Node.js on the runner image

#### `validate-compose`
1. Clones the repository
2. Validates `docker-compose.yml` with dummy environment variables (prevents required variable errors)

---

## `onmain.yml` — `main` branch

Runs sequentially (bump first, parallel builds follow).

```
push → main
         │
         └── bump-versions          (always sequential)
                  │
                  ├── build-backend   (parallel)
                  ├── update-database (parallel)
                  └── build-webapp    (parallel)
```

### Job `bump-versions`

Increments the **patch** version for both applications, commits back to `main`, and creates git tags.

| File | Field |
|------|-------|
| `apps/backend/VERSION` | plain text, e.g.: `1.0.5` |
| `apps/webapp/package.json` | `version` field via `jq` |

Pushing back uses HTTPS with embedded token in URL to bypass container network SSH limitations (see [Network Limitations](#runner-network-limitations)).

Job outputs (used by downstream build jobs):
- `BACKEND_VERSION` — e.g.: `1.0.6`
- `WEBAPP_VERSION` — e.g.: `1.0.6`

### Job `build-backend`

1. Clones `main` via HTTPS
2. Uses pre-installed Go toolchain on runner
3. Compiles binary: `CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -mod=vendor -ldflags "-X .../version.Version=X.Y.Z" -o main ./cmd/api`
   - `CGO_ENABLED=0` is **mandatory** — runner is Ubuntu (glibc) but final runtime image is Alpine (musl). Without this, binary fails with `exec ./main: no such file or directory` in production.
4. Resolves Gitea container IP inside `nilbyte-git` network via `docker network inspect`
5. Performs `docker login` to internal registry (`172.20.x.x:3000`)
6. `docker build --network=host` — uses host network to pull base images from Docker Hub
7. Pushes `backend:latest` and `backend:X.Y.Z` to registry

### Job `update-database`

1. Clones `main`
2. Log in to registry
3. `docker build` uses `database/Dockerfile`, which compiles the `migrate` binary inside final image
4. Pushes `database:latest` — image contains `migrate` binary + all migration and seed SQL files

### Job `build-webapp`

1. Clones `main`
2. `npm ci` + `npm run build` with injected `VITE_API_URL` and `VITE_APP_VERSION`
3. Log in to registry
4. `docker build --network=host`
5. Pushes `webapp:latest` and `webapp:X.Y.Z`

---

## Required Secrets

| Secret | Used for |
|--------|----------|
| `TOKEN_COMPLETE` | HTTPS clone (Main & PR), pushing tags, and docker login |
| `DEPLOY_SSH_KEY` | SSH key for VPS access |
| `DEPLOY_HOST` | VPS IP address or hostname |
| `DEPLOY_USER` | Deployment user (e.g.: `deploy`) |

---

## Runner Network Limitations

The `act_runner` runs each job as a Docker container inside the `nilbyte-git` network. This network is **isolated** — no routing to the public internet or host via external domains.

### What works inside the network

| Destination | Status | Reason |
|-------------|--------|--------|
| `gitea:3000` (HTTP) | ✅ | Internal Docker DNS inside `nilbyte-git` |
| `gitea.nilbyte.com.br` | ❌ | Routes through Cloudflare Tunnel → unreachable internally |
| `registry-1.docker.io` (Docker Hub) | ❌ | External DNS unresolved in isolated network |
| Host via `--network=host` during build | ✅ | Bypasses isolated network and uses host DNS |

### Why checkout uses `gitea.server_url`

Gitea injects `gitea.server_url` as `http://gitea:3000` (internal address), enabling HTTPS clone without internet connectivity.

### Why docker login uses container IP instead of hostname

The Docker daemon runs on the HOST (outside the runner container). The host lacks DNS resolution for `gitea` (internal Docker network name). Therefore, CI resolves the actual IP via:

```bash
docker network inspect nilbyte-git \
  --format '{{range .Containers}}{{if eq .Name "gitea"}}{{.IPv4Address}}{{end}}{{end}}' \
  | cut -d/ -f1
```

The output (e.g.: `172.20.0.4`) is passed as registry address.

### Why `--network=host` in docker builds

`docker build` without flags defaults to host `bridge` network with standard DNS. Using `--network=host` allows temporary build containers to inherit host network settings and pull base images (`alpine`, `golang`, `node`, `nginx`) from Docker Hub.

### Server Configuration (One-time Setup)

Host Docker daemon must accept internal HTTP registry. Configured once in `/etc/docker/daemon.json`:

```json
{"insecure-registries": ["172.20.0.0/20"]}
```

Reloaded via `sudo systemctl reload docker` (no restart — reloads configuration without stopping containers).

---

## Complete Network Diagram

```
Runner container (nilbyte-git network)
│
├── git clone → http://gitea:3000/...          ✅ Internal Docker DNS
├── git push  → http://oauth2:TOKEN@gitea:3000  ✅ Token in URL
│
├── docker inspect nilbyte-git → gitea IP      ✅ Mounted socket
├── docker login 172.20.0.4:3000               ✅ Direct IP (insecure registry)
│
└── docker build --network=host
      └── pull alpine/node/nginx → Docker Hub  ✅ Uses host DNS
```

---

## Complete Deployment Workflow

```
1. PR merged into main
2. onmain.yml triggers
3. bump-versions: VERSION 1.0.5 → 1.0.6, commit, tag backend-v1.0.6
4. build-backend: compile binary (CGO_ENABLED=0), generate backend:1.0.6 + backend:latest
5. update-database: `docker build` generates database:latest with `migrate` binary compiled in Dockerfile
6. build-webapp: npm build, generate webapp:1.0.6 + webapp:latest
7. Deploy job (via SSH):
   a. cd /srv/nilbyte/infrastructure
   b. docker compose pull
   c. docker compose up -d
```

### Available commands in manage-somma.sh

| Command | Action |
|---------|--------|
| `start` | Starts full stack (db → migrate → backend + webapp) |
| `stop` | Stops and removes all stack containers |
| `restart` | stop + start |
| `pull` | Pulls latest images from registry |
| `update` | pull + stop + start |
| `logs` | Real-time logs for all services |
| `status` | Current status of containers |
| `migrate` | Runs `./migrate up` manually (one-shot) |
| `seed` | Runs `./migrate seed` manually (one-shot) |
