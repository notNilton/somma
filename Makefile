APP_NAME ?= tallyoh

# ── Shell / OS detection ──────────────────────────────────────────────────────
ifeq ($(OS),Windows_NT)
  SHELL := bash
  CONTAINER_ENGINE ?= docker
  # Convert backslashes so Docker bind-mount paths work
  CURDIR_UNIX := $(subst \,/,$(CURDIR))
else
  SHELL := /usr/bin/env bash
  CONTAINER_ENGINE ?= $(shell command -v docker >/dev/null 2>&1 && printf docker || printf podman)
  CURDIR_UNIX := $(CURDIR)
endif

POSTGRES_IMAGE ?= docker.io/library/postgres:18-alpine
POSTGRES_CONTAINER ?= $(APP_NAME)-db-local
POSTGRES_VOLUME ?= $(APP_NAME)-postgres-local-data
POSTGRES_USER ?= postgres
POSTGRES_PASSWORD ?= postgres
POSTGRES_DB ?= tallyoh
POSTGRES_PORT ?= 5454

BACKEND_PORT ?= 3300
WEBAPP_PORT ?= 3400
ENV ?= development
JWT_SECRET ?= dev-secret-change-in-production-x
WEBAPP_URL ?= http://localhost:$(WEBAPP_PORT)
API_URL ?= http://localhost:$(BACKEND_PORT)
WEB_DEV_API_URL ?= http://$(APP_NAME)-backend-dev:$(BACKEND_PORT)
DATABASE_URL ?= postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:$(POSTGRES_PORT)/$(POSTGRES_DB)?sslmode=disable
CONTAINER_DATABASE_URL ?= postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@$(POSTGRES_CONTAINER):5432/$(POSTGRES_DB)?sslmode=disable
DEV_NETWORK ?= $(APP_NAME)-dev

ENABLE_MINIO ?= 0
MINIO_IMAGE ?= docker.io/minio/minio:latest
MINIO_CONTAINER ?= $(APP_NAME)-minio-local
MINIO_VOLUME ?= $(APP_NAME)-minio-local-data
MINIO_ROOT_USER ?= minioadmin
MINIO_ROOT_PASSWORD ?= minioadmin
MINIO_PORT ?= 9000
MINIO_CONSOLE_PORT ?= 9001
REMOVE_VOLUME ?= 0
DOC_PORT ?= 8090
MIGRATE_IMAGE ?= $(APP_NAME)-database-dev

.DEFAULT_GOAL := help

.PHONY: help up dev deps-up deps-down deps-reset net db-up db-wait db-down db-reset db-setup minio-up minio-down env backend web doc migrate-up migrate-down migrate-version seed db-seed-complete db-seed-barebones seed-complete seed-barebones test clean migrate-image

help:
	@printf '%s\n' 'Tallyoh local dev'
	@printf '\n%s\n' 'Fluxo principal:'
	@printf '  make up              Sobe Postgres, migra, semeia e inicia todos os servicos em background\n'
	@printf '  make backend         Inicia a API Go em localhost:$(BACKEND_PORT) (Docker + hot reload)\n'
	@printf '  make web             Inicia o app SSR/HTMX em localhost:$(WEBAPP_PORT) (Docker + hot reload)\n'
	@printf '  make doc             Inicia o Swagger UI em localhost:$(DOC_PORT)/doc\n'
	@printf '  make db-setup        Sobe o banco, aplica migrations e insere dados iniciais (seeds)\n'
	@printf '  make deps-up         Sobe dependencias locais: Postgres e MinIO se ENABLE_MINIO=1\n'
	@printf '  make deps-down       Para dependencias locais\n'
	@printf '  make deps-reset      Para dependencias locais e remove volumes locais\n'
	@printf '\n%s\n' 'Banco e dados:'
	@printf '  make db-up           Sobe somente o Postgres local em localhost:$(POSTGRES_PORT)\n'
	@printf '  make db-down         Para somente o Postgres local\n'
	@printf '  make db-reset        Recria o Postgres local do zero\n'
	@printf '  make migrate-up      Aplica migrations\n'
	@printf '  make migrate-down    Reverte uma migration\n'
	@printf '  make migrate-version Mostra a versao atual\n'
	@printf '  make db-seed-complete   Aplica o seed completo com transacoes\n'
	@printf '  make db-seed-barebones  Aplica o seed basico com usuario, contas e veiculo\n'
	@printf '\n%s\n' 'App:'
	@printf '  make test            Roda testes Go\n'
	@printf '\n%s\n' 'MinIO opcional:'
	@printf '  make minio-up        Sobe MinIO manualmente\n'
	@printf '  ENABLE_MINIO=1 make up inclui MinIO nas dependencias locais\n'

up: db-setup
	@$(CONTAINER_ENGINE) build -q -t $(APP_NAME)-backend-dev -f apps/backend/Dockerfile.dev apps/backend/
	@$(CONTAINER_ENGINE) build -q -t $(APP_NAME)-web-dev -f apps/web/Dockerfile.dev apps/web/
	@-$(CONTAINER_ENGINE) rm -f $(APP_NAME)-backend-dev $(APP_NAME)-web-dev $(APP_NAME)-doc-dev 2>/dev/null || true
	@$(CONTAINER_ENGINE) run -d \
		--network $(DEV_NETWORK) \
		-v "$(CURDIR_UNIX)/apps/backend:/app" \
		-p $(BACKEND_PORT):$(BACKEND_PORT) \
		-e PORT=$(BACKEND_PORT) \
		-e DATABASE_URL=$(CONTAINER_DATABASE_URL) \
		-e JWT_SECRET=$(JWT_SECRET) \
		-e WEBAPP_URL=$(WEBAPP_URL) \
		-e ENV=$(ENV) \
		--name $(APP_NAME)-backend-dev \
		$(APP_NAME)-backend-dev >/dev/null
	@$(CONTAINER_ENGINE) run -d \
		--network $(DEV_NETWORK) \
		--add-host=host.docker.internal:host-gateway \
		-v "$(CURDIR_UNIX)/apps/web:/app" \
		-v "$(APP_NAME)-web-node-modules:/app/node_modules" \
		-p $(WEBAPP_PORT):$(WEBAPP_PORT) \
		-e API_URL=$(WEB_DEV_API_URL) \
		--name $(APP_NAME)-web-dev \
		$(APP_NAME)-web-dev >/dev/null
	@$(CONTAINER_ENGINE) run -d \
		--network $(DEV_NETWORK) \
		-v "$(CURDIR_UNIX)/apps/doc/openapi.yml:/openapi.yml:ro" \
		-p $(DOC_PORT):8080 \
		-e SWAGGER_JSON=/openapi.yml \
		-e BASE_URL=/doc \
		-e DEEP_LINKING=true \
		--name $(APP_NAME)-doc-dev \
		docker.io/swaggerapi/swagger-ui:latest >/dev/null
	@printf 'Servicos iniciados:\n'
	@printf '  Backend : http://localhost:$(BACKEND_PORT)\n'
	@printf '  Web     : http://localhost:$(WEBAPP_PORT)\n'
	@printf '  Doc     : http://localhost:$(DOC_PORT)/doc\n'
	@printf 'Logs: docker logs -f <container>\n'

dev:
	@set -euo pipefail; \
	trap 'jobs -pr | xargs -r kill 2>/dev/null || true' INT TERM EXIT; \
	$(MAKE) --no-print-directory backend

deps-up: db-up
	@if [ "$(ENABLE_MINIO)" = "1" ]; then \
		$(MAKE) --no-print-directory minio-up; \
	else \
		printf '%s\n' 'MinIO nao esta habilitado. Use ENABLE_MINIO=1 make deps-up se precisar.'; \
	fi

deps-down: db-down
	@if [ "$(ENABLE_MINIO)" = "1" ]; then \
		$(MAKE) --no-print-directory minio-down; \
	fi

deps-reset: db-reset
	@if [ "$(ENABLE_MINIO)" = "1" ]; then \
		$(MAKE) --no-print-directory minio-down REMOVE_VOLUME=1; \
	fi

net:
	@$(CONTAINER_ENGINE) network inspect $(DEV_NETWORK) >/dev/null 2>&1 || \
		$(CONTAINER_ENGINE) network create $(DEV_NETWORK) >/dev/null

db-up: net
	@set -euo pipefail; \
	command -v "$(CONTAINER_ENGINE)" >/dev/null 2>&1 || { printf 'Container engine not found: %s\n' "$(CONTAINER_ENGINE)" >&2; exit 1; }; \
	if $(CONTAINER_ENGINE) container inspect "$(POSTGRES_CONTAINER)" >/dev/null 2>&1; then \
		printf 'Starting existing Postgres container %s\n' "$(POSTGRES_CONTAINER)"; \
		$(CONTAINER_ENGINE) start "$(POSTGRES_CONTAINER)" >/dev/null; \
		$(CONTAINER_ENGINE) network connect $(DEV_NETWORK) "$(POSTGRES_CONTAINER)" 2>/dev/null || true; \
	else \
		printf 'Creating Postgres container %s on localhost:%s\n' "$(POSTGRES_CONTAINER)" "$(POSTGRES_PORT)"; \
		if ! $(CONTAINER_ENGINE) volume inspect "$(POSTGRES_VOLUME)" >/dev/null 2>&1; then \
			$(CONTAINER_ENGINE) volume create "$(POSTGRES_VOLUME)" >/dev/null; \
		fi; \
		$(CONTAINER_ENGINE) run -d \
			--name "$(POSTGRES_CONTAINER)" \
			--network $(DEV_NETWORK) \
			-e POSTGRES_USER="$(POSTGRES_USER)" \
			-e POSTGRES_PASSWORD="$(POSTGRES_PASSWORD)" \
			-e POSTGRES_DB="$(POSTGRES_DB)" \
			-p "$(POSTGRES_PORT):5432" \
			-v "$(POSTGRES_VOLUME):/var/lib/postgresql" \
			--health-cmd="pg_isready -U $(POSTGRES_USER) -d $(POSTGRES_DB)" \
			--health-interval=5s \
			--health-timeout=3s \
			--health-retries=20 \
			"$(POSTGRES_IMAGE)" >/dev/null; \
	fi
	@$(MAKE) --no-print-directory db-wait

db-wait:
	@set -euo pipefail; \
	printf 'Waiting for Postgres at localhost:%s' "$(POSTGRES_PORT)"; \
	for _ in {1..60}; do \
		status="$$($(CONTAINER_ENGINE) inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$(POSTGRES_CONTAINER)" 2>/dev/null || true)"; \
		if [ "$$status" = "healthy" ]; then \
			printf '\nPostgres is ready.\n'; \
			exit 0; \
		elif [ -z "$$status" ]; then \
			if $(CONTAINER_ENGINE) exec "$(POSTGRES_CONTAINER)" pg_isready -U "$(POSTGRES_USER)" -d "$(POSTGRES_DB)" >/dev/null 2>&1; then \
				printf '\nPostgres is ready.\n'; \
				exit 0; \
			fi; \
		fi; \
		printf '.'; \
		sleep 1; \
	done; \
	printf '\nPostgres did not become healthy in time.\n' >&2; \
	$(CONTAINER_ENGINE) logs "$(POSTGRES_CONTAINER)" >&2 || true; \
	exit 1

db-down:
	@$(CONTAINER_ENGINE) stop "$(POSTGRES_CONTAINER)" >/dev/null 2>&1 || true
	@printf 'Postgres local parado.\n'

db-reset:
	@$(CONTAINER_ENGINE) rm -f "$(POSTGRES_CONTAINER)" >/dev/null 2>&1 || true
	@$(CONTAINER_ENGINE) volume rm "$(POSTGRES_VOLUME)" >/dev/null 2>&1 || true
	@$(MAKE) --no-print-directory db-up

db-setup: db-up env migrate-up db-seed-complete

minio-up:
	@set -euo pipefail; \
	if $(CONTAINER_ENGINE) container inspect "$(MINIO_CONTAINER)" >/dev/null 2>&1; then \
		printf 'Starting existing MinIO container %s\n' "$(MINIO_CONTAINER)"; \
		$(CONTAINER_ENGINE) start "$(MINIO_CONTAINER)" >/dev/null; \
	else \
		printf 'Creating MinIO container %s on localhost:%s\n' "$(MINIO_CONTAINER)" "$(MINIO_PORT)"; \
		if ! $(CONTAINER_ENGINE) volume inspect "$(MINIO_VOLUME)" >/dev/null 2>&1; then \
			$(CONTAINER_ENGINE) volume create "$(MINIO_VOLUME)" >/dev/null; \
		fi; \
		$(CONTAINER_ENGINE) run -d \
			--name "$(MINIO_CONTAINER)" \
			-e MINIO_ROOT_USER="$(MINIO_ROOT_USER)" \
			-e MINIO_ROOT_PASSWORD="$(MINIO_ROOT_PASSWORD)" \
			-p "$(MINIO_PORT):9000" \
			-p "$(MINIO_CONSOLE_PORT):9001" \
			-v "$(MINIO_VOLUME):/data" \
			"$(MINIO_IMAGE)" server /data --console-address ":9001" >/dev/null; \
	fi

minio-down:
	@$(CONTAINER_ENGINE) stop "$(MINIO_CONTAINER)" >/dev/null 2>&1 || true
	@if [ "$(REMOVE_VOLUME)" = "1" ]; then \
		$(CONTAINER_ENGINE) rm -f "$(MINIO_CONTAINER)" >/dev/null 2>&1 || true; \
		$(CONTAINER_ENGINE) volume rm "$(MINIO_VOLUME)" >/dev/null 2>&1 || true; \
	fi
	@printf 'MinIO local parado.\n'

env:
	@if [ ! -f apps/backend/.env ]; then \
		cp apps/backend/.env.example apps/backend/.env; \
		printf 'Criado apps/backend/.env a partir do exemplo.\n'; \
	fi

# ── Backend (Docker + Air hot reload) ────────────────────────────────────────
backend: env net
	$(CONTAINER_ENGINE) build -q -t $(APP_NAME)-backend-dev -f apps/backend/Dockerfile.dev apps/backend/
	-$(CONTAINER_ENGINE) rm -f $(APP_NAME)-backend-dev
	-$(CONTAINER_ENGINE) ps -q --filter publish=$(BACKEND_PORT) | xargs -r $(CONTAINER_ENGINE) rm -f
	$(CONTAINER_ENGINE) run --rm -it \
		--network $(DEV_NETWORK) \
		-v "$(CURDIR_UNIX)/apps/backend:/app" \
		-p $(BACKEND_PORT):$(BACKEND_PORT) \
		-e PORT=$(BACKEND_PORT) \
		-e DATABASE_URL=$(CONTAINER_DATABASE_URL) \
		-e JWT_SECRET=$(JWT_SECRET) \
		-e WEBAPP_URL=$(WEBAPP_URL) \
		-e ENV=$(ENV) \
		--name $(APP_NAME)-backend-dev \
		$(APP_NAME)-backend-dev

# ── Web (Vite + React, HMR) ──────────────────────────────────────────────────
# node_modules ficam em volume separado para nao sobrescrever o mount do codigo.
# Se mudar o package.json rode: docker volume rm $(APP_NAME)-web-node-modules
web: net
	$(CONTAINER_ENGINE) build -q -t $(APP_NAME)-web-dev -f apps/web/Dockerfile.dev apps/web/
	-$(CONTAINER_ENGINE) rm -f $(APP_NAME)-web-dev
	-$(CONTAINER_ENGINE) ps -q --filter publish=$(WEBAPP_PORT) | xargs -r $(CONTAINER_ENGINE) rm -f
	$(CONTAINER_ENGINE) run --rm -it \
		--network $(DEV_NETWORK) \
		--add-host=host.docker.internal:host-gateway \
		-v "$(CURDIR_UNIX)/apps/web:/app" \
		-v "$(APP_NAME)-web-node-modules:/app/node_modules" \
		-p $(WEBAPP_PORT):$(WEBAPP_PORT) \
		-e API_URL=$(WEB_DEV_API_URL) \
		--name $(APP_NAME)-web-dev \
		$(APP_NAME)-web-dev

# ── Doc (Swagger UI com volume mount para hot reload) ────────────────────────
doc: net
	-$(CONTAINER_ENGINE) rm -f $(APP_NAME)-doc-dev
	-$(CONTAINER_ENGINE) ps -q --filter publish=$(DOC_PORT) | xargs -r $(CONTAINER_ENGINE) rm -f
	$(CONTAINER_ENGINE) run --rm -it \
		--network $(DEV_NETWORK) \
		-v "$(CURDIR_UNIX)/apps/doc/openapi.yml:/openapi.yml:ro" \
		-p $(DOC_PORT):8080 \
		-e SWAGGER_JSON=/openapi.yml \
		-e BASE_URL=/doc \
		-e DEEP_LINKING=true \
		--name $(APP_NAME)-doc-dev \
		docker.io/swaggerapi/swagger-ui:latest

migrate-up:
	@$(MAKE) --no-print-directory migrate-image
	@$(CONTAINER_ENGINE) run --rm \
		--network $(DEV_NETWORK) \
		-e DATABASE_URL=$(CONTAINER_DATABASE_URL) \
		--entrypoint ./migrate \
		$(MIGRATE_IMAGE) up

migrate-down:
	@$(MAKE) --no-print-directory migrate-image
	@$(CONTAINER_ENGINE) run --rm \
		--network $(DEV_NETWORK) \
		-e DATABASE_URL=$(CONTAINER_DATABASE_URL) \
		--entrypoint ./migrate \
		$(MIGRATE_IMAGE) down

migrate-version:
	@$(MAKE) --no-print-directory migrate-image
	@$(CONTAINER_ENGINE) run --rm \
		--network $(DEV_NETWORK) \
		-e DATABASE_URL=$(CONTAINER_DATABASE_URL) \
		--entrypoint ./migrate \
		$(MIGRATE_IMAGE) version

seed: db-seed-complete

db-seed-complete: migrate-up
	@$(CONTAINER_ENGINE) run --rm \
		--network $(DEV_NETWORK) \
		-e DATABASE_URL=$(CONTAINER_DATABASE_URL) \
		--entrypoint ./migrate \
		$(MIGRATE_IMAGE) seed-complete

db-seed-barebones: migrate-up
	@$(CONTAINER_ENGINE) run --rm \
		--network $(DEV_NETWORK) \
		-e DATABASE_URL=$(CONTAINER_DATABASE_URL) \
		--entrypoint ./migrate \
		$(MIGRATE_IMAGE) seed-barebones

# aliases legacy
seed-complete: db-seed-complete
seed-barebones: db-seed-barebones

test:
	@cd apps/backend && go test ./...
	@cd database && go test ./...

clean:
	@rm -rf apps/backend/tmp

migrate-image:
	@set -euo pipefail; \
	if ! $(CONTAINER_ENGINE) image inspect "$(MIGRATE_IMAGE)" >/dev/null 2>&1; then \
		$(CONTAINER_ENGINE) build -q -t "$(MIGRATE_IMAGE)" -f database/Dockerfile . >/dev/null; \
	fi
