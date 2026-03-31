FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY database/ .

ENV GOWORK=off
RUN go build -mod=vendor -o migrate ./cmd/migrate

# ---

FROM alpine:3.19 AS runner

WORKDIR /app

RUN apk --no-cache add ca-certificates

COPY --from=builder /app/migrate .
COPY database/migrations/ /database/migrations/
COPY database/seeds/ /database/seeds/

ENV MIGRATIONS_PATH=/database/migrations

CMD ["./migrate", "up"]
