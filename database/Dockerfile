FROM alpine:3.19

WORKDIR /app

RUN apk --no-cache add ca-certificates

COPY database/migrate .
COPY database/migrations/ /database/migrations/
COPY database/seeds/ /database/seeds/

ENV MIGRATIONS_PATH=/database/migrations

CMD ["./migrate", "up"]
