FROM golang:1.24-alpine AS builder

WORKDIR /src/database

RUN apk --no-cache add ca-certificates

COPY database/ ./

ENV GOWORK=off

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -mod=vendor -o migrate ./cmd/migrate

FROM alpine:3.19

WORKDIR /app

RUN apk --no-cache add ca-certificates

COPY --from=builder /src/database/migrate .
COPY database/migrations/ /database/migrations/
COPY database/seeds/ /database/seeds/

ENV MIGRATIONS_PATH=/database/migrations

CMD ["./migrate", "up"]
