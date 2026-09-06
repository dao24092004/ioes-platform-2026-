# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs/common-node ./libs/common-node
COPY services/ai-suite/api-gateway ./services/ai-suite/api-gateway

RUN pnpm install --frozen-lockfile --filter @ioes/ai-gateway...
RUN pnpm --filter @ioes/ai-gateway build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S ioes && adduser -S ioes -G ioes

COPY --from=builder /workspace/services/ai-suite/api-gateway/dist ./dist
COPY --from=builder /workspace/services/ai-suite/api-gateway/node_modules ./node_modules

USER ioes
EXPOSE 9100

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:9100/health || exit 1

CMD ["node", "dist/services/ai-suite/api-gateway/src/main.js"]
