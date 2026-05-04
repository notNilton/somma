# Estágio 1: Build
FROM node:22-alpine AS build

WORKDIR /app

# Copia arquivos de dependências primeiro para aproveitar o cache do Docker
COPY apps/webapp/package*.json ./
RUN npm ci --prefer-offline

# Copia o restante do código e executa o build
COPY apps/webapp/ ./

ARG VITE_API_URL
ARG VITE_APP_VERSION
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_VERSION=$VITE_APP_VERSION

RUN npm run build

# Estágio 2: Produção
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY apps/webapp/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
