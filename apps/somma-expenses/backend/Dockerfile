FROM rust:alpine AS builder

RUN apk add --no-cache musl-dev pkgconfig openssl-dev ca-certificates git

WORKDIR /src

# Copy workspace files needed for compilation
COPY Cargo.toml Cargo.lock* ./
COPY crates/ crates/
COPY apps/somma-expenses/backend/ apps/somma-expenses/backend/
COPY apps/somma-vehicles/backend/ apps/somma-vehicles/backend/

WORKDIR /src/apps/somma-expenses/backend

RUN cargo build --release

FROM alpine:3.19

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /src/target/release/somma-expenses-backend ./main

USER appuser

EXPOSE 3300

CMD ["./main"]
