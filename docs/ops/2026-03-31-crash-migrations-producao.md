# Incident: Backend crash + migrations nunca aplicadas em produção

**Data:** 2026-03-31  
**Ambiente:** `niflheim` (VPS, produção)  
**Status:** Resolvido

---

## Sintomas observados

1. Container `personalledger_backend_prod` em restart loop contínuo
2. Log do container:
   ```
   exec ./main: no such file or directory
   ```
3. Chamadas à API retornando 502 (nginx upstream down)
4. Banco de dados sem schema — nenhuma tabela existia (`relation "transactions" does not exist`)

---

## Causa raiz — Problema 1: binário incompatível com Alpine

### O que acontecia

O job `build-backend` no `onmain.yml` compilava o binário Go **no runner Ubuntu** (glibc) e copiava para uma imagem `alpine:3.19` (musl libc). O erro `exec ./main: no such file or directory` não significa que o arquivo sumiu — significa que o loader do kernel (`/lib/ld-linux-x86-64.so.2`) referenciado no binário não existe no Alpine, que usa `/lib/ld-musl-x86-64.so.1`.

### Por que o erro é enganoso

O kernel retorna `ENOENT` ao tentar resolver o dynamic linker do binário, o que o shell traduz como "arquivo não encontrado" — mas o arquivo `./main` existe no container. É o interpretador ELF que está faltando.

### Fix aplicado

Adicionadas variáveis de ambiente ao step `Build binary` em `.gitea/workflows/onmain.yml`:

```yaml
# build-backend
- name: Build binary
  working-directory: apps/backend
  env:
    GOWORK: "off"
  run: |
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -mod=vendor \
      -ldflags "-X github.com/nilbyte/personalledger/backend/internal/version.Version=${{ needs.bump-versions.outputs.BACKEND_VERSION }}" \
      -o main ./cmd/api

# build-database
- name: Build migrate binary
  working-directory: database
  env:
    GOWORK: "off"
  run: CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -mod=vendor -o migrate ./cmd/migrate
```

`CGO_ENABLED=0` força a compilação estática (sem linking dinâmico). O binário gerado é compatível com qualquer distribuição Linux, incluindo Alpine/musl.

---

## Causa raiz — Problema 2: migrations nunca foram aplicadas

### O que acontecia

O `docker-compose.backend.yml` do servidor tinha apenas o serviço `personalledger-backend`. Não havia nenhum serviço de migration no compose. O banco subia vazio e o backend tentava usar tabelas que não existiam.

### Fix aplicado

Adicionado serviço `personalledger-migrate` ao `docker-compose.backend.yml`:

```yaml
services:
  personalledger-migrate:
    image: gitea.nilbyte.com.br/nilByte/personalledger/database:latest
    container_name: personalledger_migrate_prod
    restart: "no"
    environment:
      - DATABASE_URL=postgresql://...
    depends_on:
      personalledger-db:
        condition: service_healthy
    networks:
      - personalledger-internal

  personalledger-backend:
    # ...
    depends_on:
      personalledger-migrate:
        condition: service_completed_successfully
```

O `restart: "no"` é intencional — o container de migration deve rodar uma vez, aplicar as migrations pendentes e encerrar. O `depends_on` em cadeia garante a ordem:

```
personalledger-db (healthy) → personalledger-migrate (completed) → personalledger-backend (up)
```

---

## Causa raiz — Problema 3: migrate não conseguia conectar ao banco

### O que acontecia

Após adicionar o serviço, o migrate falhava com:

```
dial tcp 172.24.0.4:5432: connect: connection refused
```

E depois:

```
dial tcp: lookup personalledger_db_prod on 127.0.0.11:53: server misbehaving
```

### Por que acontecia

O `manage-personalledger.sh` subia o banco separadamente com `docker-compose.db.yml` e depois subia backend+webapp com `docker-compose.backend.yml -f docker-compose.webapp.yml --remove-orphans`. O flag `--remove-orphans` **removia o container `personalledger_db_prod`** por ele não estar nos compose files de backend/webapp. Quando o migrate tentava conectar, o banco já tinha sido destruído.

Além disso, `sleep 3` era insuficiente para o PostgreSQL inicializar do zero.

### Fix aplicado

**1. Healthcheck no banco** (`docker-compose.db.yml`):

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${MIRANTE_DB_USER} -d ${MIRANTE_DB_NAME}"]
  interval: 5s
  timeout: 5s
  retries: 10
```

**2. Script `manage-personalledger.sh` — subir tudo junto:**

```sh
start|up)
    docker network create personalledger-internal 2>/dev/null || true
    docker compose $COMPOSE_FILES up -d
    ;;
```

Todos os 3 compose files usados juntos — Docker Compose resolve o `depends_on` entre serviços de arquivos diferentes, e nenhum container é tratado como órfão.

---

## Causa raiz — Problema 4: comando `seed` não rodava o seed

### O que acontecia

```sh
sh scripts/manage-personalledger.sh seed
# ✅ Migrations applied (version 4)
# Database Setup Finished.
```

O seed "rodava" mas só aplicava migrations. Nenhum dado de seed era inserido.

### Por que acontecia

O case `seed` no `manage-personalledger.sh` rodava o container sem argumento:

```sh
docker run --rm ... gitea.nilbyte.com.br/.../database:latest
```

Sem argumento, o container executa o `CMD` padrão do Dockerfile: `./migrate up`. O binário `migrate` suporta o subcomando `seed` (implementado em `database/cmd/migrate/main.go`), mas nunca era chamado com ele.

### Fix aplicado

```sh
migrate)
    docker run --rm --network personalledger-internal --env-file apps/personalledger/.env \
      gitea.nilbyte.com.br/nilByte/personalledger/database:latest ./migrate up
    ;;
seed)
    docker run --rm --network personalledger-internal --env-file apps/personalledger/.env \
      gitea.nilbyte.com.br/nilByte/personalledger/database:latest ./migrate seed
    ;;
```

---

## Resultado final

```
[+] up 4/4
 ✔ Container personalledger_db_prod      Healthy    6.4s
 ✔ Container personalledger_migrate_prod Exited     7.0s   ← ✅ Migrations applied (version 4)
 ✔ Container personalledger_webapp_prod  Created
 ✔ Container personalledger_backend_prod Created
```

Backend rodando, banco com schema correto, logs:

```
2026/04/01 02:53:15 jobs: scheduler started
2026/04/01 02:53:15 starting server on :3000
2026/04/01 02:53:31 POST /auth/login 401 10.210728ms
```

---

## Lições

| # | Lição |
|---|-------|
| 1 | Binários Go para Alpine **sempre** precisam de `CGO_ENABLED=0`. Sem isso, o erro aparece como "file not found" — enganoso porque o arquivo existe mas o dynamic linker não. |
| 2 | `--remove-orphans` é perigoso em setups com múltiplos compose files que gerenciam serviços interdependentes. Preferir subir tudo com `$COMPOSE_FILES`. |
| 3 | `sleep N` é frágil para esperar banco subir. Usar `healthcheck` + `depends_on: condition: service_healthy`. |
| 4 | Um container com `CMD ["./migrate", "up"]` **não roda seed automaticamente** — são subcomandos distintos passados como argumento ao binário. |
| 5 | Sempre verificar se o migrate service existe antes de subir um stack em novo ambiente. |
