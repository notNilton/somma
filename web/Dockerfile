FROM golang:1.25-alpine AS builder

WORKDIR /src/web

RUN apk add --no-cache ca-certificates

COPY web/go.mod web/go.sum ./
RUN go mod download

COPY web/ ./

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/web ./cmd

FROM alpine:3.19

WORKDIR /app

RUN apk --no-cache add ca-certificates

COPY --from=builder /out/web .

EXPOSE 3400

CMD ["./web"]
