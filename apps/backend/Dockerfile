FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o main ./cmd/api && \
    go build -o migrate ./cmd/migrate

# ---

FROM alpine:3.19 AS runner

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/main .
COPY --from=builder /app/migrate .

USER appuser

EXPOSE 3000

ENV MIGRATIONS_PATH=/database/migrations

CMD ["./main"]
