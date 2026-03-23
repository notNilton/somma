FROM node:20-alpine AS builder

WORKDIR /app


COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/webapp/package.json ./apps/webapp/
COPY packages/database/package.json ./packages/database/

RUN npm ci --workspaces --if-present

COPY apps/webapp/ ./apps/webapp/
COPY packages/database/ ./packages/database/

ARG VITE_API_URL
ARG VITE_APP_VERSION

RUN npm run deploy:webapp

# ---

FROM nginx:alpine AS runner

COPY --from=builder /app/apps/webapp/dist /usr/share/nginx/html
COPY apps/webapp/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
