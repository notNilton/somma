FROM docker.io/library/golang:1.26-alpine AS builder

WORKDIR /src

RUN apk add --no-cache ca-certificates tzdata git

COPY apps/somma-expenses/backend/go.mod apps/somma-expenses/backend/go.sum apps/somma-expenses/backend/VERSION ./apps/somma-expenses/backend/
COPY database/go.mod database/go.sum ./database/
COPY database/ ./database/

WORKDIR /src/apps/somma-expenses/backend

ARG VERSION=dev

RUN mkdir -p /out && go mod download

COPY apps/somma-expenses/backend/cmd/ ./cmd/
COPY apps/somma-expenses/backend/internal/ ./internal/

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags "-X github.com/nilbyte/somma/backend/internal/version.Version=${VERSION}" \
    -o /out/main ./cmd/api

WORKDIR /src/database

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -mod=vendor -o /out/migrate ./cmd/migrate

FROM docker.io/library/alpine:3.19

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /out/main ./main
COPY --from=builder /out/migrate ./migrate
COPY database/migrations/ ./migrations/
COPY apps/somma-expenses/backend/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh ./migrate

USER appuser

EXPOSE 3300

CMD ["./entrypoint.sh"]
