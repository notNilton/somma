FROM golang:1.26-alpine AS builder

WORKDIR /src

RUN apk add --no-cache ca-certificates tzdata git

COPY apps/backend/go.mod apps/backend/go.sum apps/backend/VERSION ./apps/backend/
COPY database/go.mod database/go.sum ./database/
COPY database/ ./database/

WORKDIR /src/apps/backend

ARG VERSION=dev

RUN go mod download

COPY apps/backend/cmd/ ./cmd/
COPY apps/backend/internal/ ./internal/

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags "-X github.com/nilbyte/personalledger/backend/internal/version.Version=${VERSION}" \
    -o /out/main ./cmd/api

FROM alpine:3.19

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /out/main ./main

USER appuser

EXPOSE 3300

CMD ["./main"]
