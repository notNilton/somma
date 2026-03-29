FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.work ./
COPY apps/backend/go.mod apps/backend/go.sum ./apps/backend/
COPY database/go.mod ./database/
RUN go mod download

COPY apps/backend/ ./apps/backend/
COPY database/ ./database/

ARG BUILD_VERSION=dev
RUN go build \
      -ldflags "-X github.com/nilbyte/mirante/backend/internal/version.Version=${BUILD_VERSION}" \
      -o main ./apps/backend/cmd/api && \
    go build -o migrate ./database/cmd/migrate

# ---

FROM alpine:3.19 AS runner

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/main .
COPY --from=builder /app/migrate .
COPY database/migrations/ /database/migrations/
COPY database/seeds/ /database/seeds/

USER appuser

EXPOSE 3000

ENV MIGRATIONS_PATH=/database/migrations

CMD ["./main"]
