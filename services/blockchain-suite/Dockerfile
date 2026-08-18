# ============================================
# blockchain-suite Dockerfile (Node.js / NestJS)
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace root so pnpm can resolve @ioes/common-node
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY libs/common-node ./libs/common-node
COPY services/blockchain-suite ./services/blockchain-suite

WORKDIR /app/services/blockchain-suite
RUN pnpm install --frozen-lockfile
RUN pnpm run build

# ---------- Runtime ----------
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy build output + production deps
COPY --from=builder /app/libs/common-node /app/libs/common-node
COPY --from=builder /app/services/blockchain-suite/dist /app/dist
COPY --from=builder /app/services/blockchain-suite/package.json /app/package.json
COPY --from=builder /app/services/blockchain-suite/node_modules /app/node_modules

WORKDIR /app

EXPOSE 9200
USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9200/health || exit 1

CMD ["node", "dist/main.js"]
