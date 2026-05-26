FROM docker.io/library/golang:1.26-alpine AS builder

WORKDIR /src

RUN apk add --no-cache ca-certificates tzdata git

COPY apps/backend/go.mod apps/backend/go.sum apps/backend/VERSION ./apps/backend/
COPY database/go.mod database/go.sum ./database/
COPY database/ ./database/

WORKDIR /src/apps/backend

ARG VERSION=dev

RUN mkdir -p /out && go mod download

COPY apps/backend/cmd/ ./cmd/
COPY apps/backend/internal/ ./internal/

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags "-X github.com/nilbyte/tallyoh/backend/internal/version.Version=${VERSION}" \
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
COPY apps/backend/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh ./migrate

USER appuser

EXPOSE 3300

CMD ["./entrypoint.sh"]
