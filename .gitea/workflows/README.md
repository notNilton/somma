# CI/CD — Gitea Actions

Pipeline de integração e entrega contínua do Personalledger, rodando no act_runner hospedado no VPS `niflheim`.

---

# Gitea Runner Pools

Este repositório usa runners separados por workload para evitar que builds de aplicação concorram entre si no mesmo host.

## Contexto do host (VPS Niflheim)

- 4 vCPU / 8 GB de RAM
- Gitea e stack de produção rodando no mesmo host.
- Os runners são configurados para limitar o impacto no servidor, priorizando a estabilidade dos serviços de produção sobre a velocidade do CI.

## Topologia

- `basic`: Detecção de mudanças, bump/tag e validações leves de infraestrutura.
- `go`: Backend Go e Migrations.
- `basic`: Deploy por SSH.
- `typescript`: Webapp React, Vite, e outras ferramentas Node.js.

## Limites operacionais

- `go`: `mem_limit: 1024m`, `cpu_shares: 96`.
- `typescript`: `mem_limit: 2048m`, `cpu_shares: 160`.
- Ambos têm `capacity: 1` e `oom_score_adj: 500`.
- Os runners não têm limite de CPU fixo para permitir bursts quando o host está livre.

## Como o workflow escolhe o runner

O seletor é o `runs-on` do job.

### Backend Go / Infra

```yaml
jobs:
  build:
    runs-on: go
```

### Basic / automações leves

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

### Webapp TypeScript / React

```yaml
jobs:
  build:
    runs-on: typescript
```

## O que evitar

- **Não use `ubuntu-latest`** como label genérico.
- **Não use `react`** (label depreciado; use `typescript`).
- Não instale toolchains pesadas manualmente se a imagem do runner já fornece isso.

## Setup de toolchain

As imagens dos runners já trazem as toolchains principais (`go`, `node`, `npm`).

Use `actions/setup-go` ou `actions/setup-node` apenas quando precisar:
- Fixar uma versão específica diferente da embutida.
- Usar cache nativo da action.
- Testar múltiplas versões.

---

## Operação (Deploy Explícito)

O deploy no VPS é um job explícito na pipeline:
1.  A pipeline publica as imagens com a tag `:latest`.
2.  Um job de `deploy` conecta via SSH ao VPS usando o usuário `deploy`.
3.  O VPS executa o `docker compose pull` e `up -d` a partir do checkout de infraestrutura em `/srv/nilbyte/infrastructure`.

## Execução seletiva

Os workflows principais não constroem mais tudo em toda execução:

- `onmain.yml` detecta backend/database/webapp separadamente, só faz bump/build/push do que mudou, mas se alterar `.gitea/workflows/**` ele força o conjunto completo.
- `pull_request.yml` valida backend/database/webapp separadamente e pula os jobs não afetados.

### Cache usado nos jobs

- Docker usa `--cache-from` com a imagem `:latest` já publicada no registry.
- Webapp usa cache local do npm via `npm ci --cache /tmp/npm-cache --prefer-offline`.
- Backend/database usam `GOCACHE` e `GOMODCACHE` em `/tmp` para reduzir recompilações quando o runner reaproveita estado.

---

## Visão geral

| Workflow | Trigger | Propósito |
|----------|---------|-----------|
| `ondev.yml` | push em `development` | Valida que o código compila e constrói |
| `onmain.yml` | push em `main` | Bump de versão + build + push de imagens para o registry |

---

## `ondev.yml` — branch `development`

Roda em paralelo, sem publicar nada. Objetivo: detectar quebras o mais cedo possível.

```
push → development
         │
         ├── build-backend    (go build -mod=vendor)
         ├── build-webapp     (npm ci + npm run build)
         └── validate-compose (docker compose config)
```

### Jobs

#### `build-backend`
1. Clona o repositório via HTTPS com `PACKAGES_TOKEN`
2. Utiliza a toolchain Go presente no runner
3. Compila com `go build -mod=vendor ./...` — usa o diretório `apps/backend/vendor/`, zero acesso à internet

#### `build-webapp`
1. Clona o repositório
2. `npm ci` + `npm run build` — usa Node.js pré-instalado na imagem do runner

#### `validate-compose`
1. Clona o repositório
2. Valida `docker-compose.yml` com variáveis de ambiente dummy (evita erro de variáveis required)

---

## `onmain.yml` — branch `main`

Roda sequencialmente (bump primeiro, builds em paralelo depois).

```
push → main
         │
         └── bump-versions          (sempre, sequencial)
                  │
                  ├── build-backend   (paralelo)
                  ├── update-database (paralelo)
                  └── build-webapp    (paralelo)
```

### Job `bump-versions`

Incrementa o **patch** de ambas as versões, commita de volta em `main` e cria as tags git.

| Arquivo | Campo |
|---------|-------|
| `apps/backend/VERSION` | texto puro, ex: `1.0.5` |
| `apps/webapp/package.json` | campo `version` via `jq` |

O push de volta usa HTTPS com o token embutido na URL para contornar a limitação de SSH dentro da rede Docker (ver [Limitações de rede](#limitações-de-rede)).

Outputs do job (usados pelos builds):
- `BACKEND_VERSION` — ex: `1.0.6`
- `WEBAPP_VERSION` — ex: `1.0.6`

### Job `build-backend`

1. Clona `main` via HTTPS
2. Utiliza a toolchain Go presente no runner
3. Compila o binário: `CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -mod=vendor -ldflags "-X .../version.Version=X.Y.Z" -o main ./cmd/api`
   - `CGO_ENABLED=0` é **obrigatório** — o runner é Ubuntu (glibc) mas a imagem final é Alpine (musl). Sem isso, o binário falha with `exec ./main: no such file or directory` em produção.
4. Resolve o IP do container Gitea na rede `nilbyte-git` via `docker network inspect`
5. Faz `docker login` no registry interno (`172.20.x.x:3000`)
6. `docker build --network=host` — usa rede do host para puxar imagens base do Docker Hub
7. Publica `backend:latest` e `backend:X.Y.Z` no registry

### Job `update-database`

1. Clona `main`
2. Faz login no registry
3. `docker build` usa o `database/Dockerfile`, que compila o binário `migrate` dentro da imagem final
4. Publica `database:latest` — imagem contém o binário `migrate` + todos os arquivos SQL de migration e seed

### Job `build-webapp`

1. Clona `main`
2. `npm ci` + `npm run build` com `VITE_API_URL` e `VITE_APP_VERSION` injetados
3. Login no registry
4. `docker build --network=host`
5. Publica `webapp:latest` e `webapp:X.Y.Z`

---

## Secrets necessários

| Secret | Usado para |
|--------|-----------|
| `TOKEN_COMPLETE` | Clone HTTPS (Main e PR), push de tags e docker login |
| `DEPLOY_SSH_KEY` | Chave SSH para acesso ao VPS |
| `DEPLOY_HOST` | Endereço IP ou domínio do VPS |
| `DEPLOY_USER` | Usuário para o deploy (ex: `deploy`) |

---

## Limitações de rede do runner

O act_runner executa cada job como um container Docker na rede `nilbyte-git`. Essa rede é **isolada** — sem roteamento para a internet ou para o host via domínio externo.

### O que funciona de dentro da rede

| Destino | Funciona? | Motivo |
|---------|-----------|--------|
| `gitea:3000` (HTTP) | ✅ | Docker DNS interno da rede `nilbyte-git` |
| `gitea.nilbyte.com.br` | ❌ | Vai para Cloudflare Tunnel → inacessível de dentro |
| `registry-1.docker.io` (Docker Hub) | ❌ | DNS externo não resolve na rede isolada |
| Host via `--network=host` no build | ✅ | Escapa da rede isolada e usa DNS do host |

### Por que o checkout usa `gitea.server_url`

O Gitea injeta `gitea.server_url` como `http://gitea:3000` (endereço interno), então o clone HTTPS funciona mesmo sem internet.

### Por que o docker login usa o IP do container e não o hostname

O daemon Docker roda no HOST (fora do container do runner). O host não tem DNS para `gitea` (nome interno da rede Docker). Por isso o CI resolve o IP real via:

```bash
docker network inspect nilbyte-git \
  --format '{{range .Containers}}{{if eq .Name "gitea"}}{{.IPv4Address}}{{end}}{{end}}' \
  | cut -d/ -f1
```

O resultado (ex: `172.20.0.4`) é usado como endereço do registry.

### Por que `--network=host` nos docker builds

`docker build` sem flag usa a rede `bridge` padrão do host, cujo DNS resolve normalmente. Com `--network=host`, os containers de build temporários herdam a rede do host e conseguem puxar imagens base (`alpine`, `golang`, `node`, `nginx`) do Docker Hub.

### Configuração necessária no servidor (one-time)

O Docker daemon do host precisa aceitar o registry HTTP interno. Configurado uma vez em `/etc/docker/daemon.json`:

```json
{"insecure-registries": ["172.20.0.0/20"]}
```

Recarregado com `sudo systemctl reload docker` (não reinicia — apenas recarrega o config sem parar containers).

---

## Diagrama completo de rede

```
Runner container (rede nilbyte-git)
│
├── git clone → http://gitea:3000/...          ✅ Docker DNS interno
├── git push  → http://oauth2:TOKEN@gitea:3000  ✅ Token na URL
│
├── docker inspect nilbyte-git → IP do gitea   ✅ socket montado
├── docker login 172.20.0.4:3000               ✅ IP direto (insecure registry)
│
└── docker build --network=host
      └── pull alpine/node/nginx → Docker Hub  ✅ usa DNS do host
```

---

## Fluxo completo de um deploy

```
1. PR mergeado em main
2. onmain.yml dispara
3. bump-versions: VERSION 1.0.5 → 1.0.6, commita, cria tag backend-v1.0.6
4. build-backend: compila binary (CGO_ENABLED=0), gera backend:1.0.6 + backend:latest
5. update-database: `docker build` gera database:latest com o binário `migrate` compilado no Dockerfile
6. build-webapp: npm build, gera webapp:1.0.6 + webapp:latest
7. Job deploy (via SSH):
   a. cd /srv/nilbyte/infrastructure
   b. docker compose pull
   c. docker compose up -d
```

### Comandos disponíveis no manage-personalledger.sh

| Comando | Ação |
|---------|------|
| `start` | Sobe toda a stack (db → migrate → backend + webapp) |
| `stop` | Para e remove todos os containers da stack |
| `restart` | stop + start |
| `pull` | Puxa imagens mais recentes do registry |
| `update` | pull + stop + start |
| `logs` | Logs em tempo real de todos os serviços |
| `status` | Estado atual dos containers |
| `migrate` | Roda `./migrate up` manualmente (one-shot) |
| `seed` | Roda `./migrate seed` manualmente (one-shot) |
