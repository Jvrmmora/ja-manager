# ---------- Build stage ----------
FROM node:20.18-alpine3.20 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20.18-alpine3.20 AS runtime

ENV NODE_ENV=production
WORKDIR /app

# curl para el HEALTHCHECK
RUN apk add --no-cache curl

# Solo dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Artefactos compilados
COPY --from=builder /app/dist ./dist

# Carpeta de logs escribible por el usuario sin privilegios
RUN mkdir -p /app/logs && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS "http://localhost:${PORT:-5000}/api/health" || exit 1

CMD ["node", "dist/index.js"]
