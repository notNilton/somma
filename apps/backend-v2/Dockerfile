FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o main ./cmd/api

# ---

FROM alpine:3.19 AS runner

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/main .

USER appuser

EXPOSE 3000

CMD ["./main"]
