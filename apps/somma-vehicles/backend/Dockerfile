FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY database /database
COPY apps/somma-vehicles/backend /app
RUN go build -o vehicles-api ./cmd/main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/vehicles-api .
EXPOSE 3310
CMD ["./vehicles-api"]
