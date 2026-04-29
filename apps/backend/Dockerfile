FROM alpine:3.19

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

COPY apps/backend/main .

USER appuser

EXPOSE 3000

CMD ["./main"]
