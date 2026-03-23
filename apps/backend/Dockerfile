FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/database/package.json ./packages/database/

RUN npm ci --workspaces --if-present

COPY packages/database/ ./packages/database/
RUN cd packages/database && npx prisma generate

COPY apps/backend/ ./apps/backend/
RUN npm run build --workspace=backend

# ---

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/database/package.json ./packages/database/

RUN npm ci --workspaces --if-present --omit=dev

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["node", "apps/backend/dist/main"]
