# CI/CD — Gitea Actions

Pipeline de integração e entrega contínua do Mirante, rodando no act_runner hospedado no VPS `niflheim`.

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
2. Localiza o binário Go em `/opt/hostedtoolcache/go/*/x64/bin` (pré-instalado na imagem do runner)
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
                  ├── build-database  (paralelo)
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
2. Localiza Go no toolcache do runner
3. Compila o binário: `go build -mod=vendor -ldflags "-X .../version.Version=X.Y.Z" -o main ./cmd/api`
4. Resolve o IP do container Gitea na rede `nilbyte-git` via `docker network inspect`
5. Faz `docker login` no registry interno (`172.20.x.x:3000`)
6. `docker build --network=host` — usa rede do host para puxar imagens base do Docker Hub
7. Publica `backend:latest` e `backend:X.Y.Z` no registry

### Job `build-database`

1. Clona `main`
2. Compila o binário `migrate`: `go build -mod=vendor -o migrate ./cmd/migrate`
3. Login no registry (mesmo fluxo do backend)
4. `docker build --network=host`
5. Publica `database:latest` — imagem contém o binário `migrate` + todos os arquivos SQL de migration

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
| `PACKAGES_TOKEN` | Clone HTTPS + push do bump-versions + docker login no registry |

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
4. build-backend: compila binary, gera backend:1.0.6 + backend:latest
5. build-database: compila migrate, gera database:latest (com SQLs embutidos)
6. build-webapp: npm build, gera webapp:1.0.6 + webapp:latest
7. No servidor: ./scripts/manage-mirante.sh pull → puxa novas imagens
8. ./scripts/manage-mirante.sh restart →
   a. mirante-migrate roda (aplica migrations pendentes)
   b. mirante-backend sobe (só após migrate concluir com sucesso)
   c. mirante-webapp sobe
```
