FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY apps/backend/go.mod apps/backend/go.sum ./
RUN go mod download

COPY apps/backend/ .
ARG BUILD_VERSION=dev
RUN go build -ldflags "-X github.com/nilbyte/mirante/backend/internal/version.Version=${BUILD_VERSION}" -o main ./cmd/api && \
    go build -o migrate ./cmd/migrate

# ---

FROM alpine:3.19 AS runner

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/main .
COPY --from=builder /app/migrate .
COPY database/migrations/ /database/migrations/

USER appuser

EXPOSE 3000

ENV MIGRATIONS_PATH=/database/migrations

CMD ["./main"]
