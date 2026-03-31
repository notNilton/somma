FROM node:22-alpine AS builder

WORKDIR /app

COPY apps/webapp/package*.json ./
RUN npm ci

COPY apps/webapp/ .

ARG VITE_API_URL
ARG VITE_APP_VERSION

RUN npm run build

# ---

FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY apps/webapp/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
