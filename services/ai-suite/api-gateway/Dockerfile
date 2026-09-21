# syntax=docker/dockerfile:1
# ============================================
# ai-suite/api-gateway (NestJS, cong 9100)
#
# Build TU THU MUC GOC monorepo:
#   docker build -f services/ai-suite/api-gateway/Dockerfile -t ioes/ai-gateway:dev .
# ============================================
FROM node:20-alpine AS builder
WORKDIR /workspace

ENV CI=true \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Script `prepare` cua package.json goc goi `husky install`. pnpm chay lifecycle
# cua project goc ke ca khi --filter chi chon ai-gateway, nhung husky lai nam
# trong devDependencies cua goc nen khong duoc cai -> "sh: husky: not found" va
# lan install that bai. HUSKY=0 khong cuu duoc vi loi la thieu file thuc thi chu
# khong phai husky tu tu choi. Go han script do khoi ban package.json trong
# image (git hook chang co nghia ly gi trong container, .git cung bi
# .dockerignore loai ra roi).
RUN npm pkg delete scripts.prepare
COPY libs/common-node ./libs/common-node
COPY services/ai-suite/api-gateway ./services/ai-suite/api-gateway

RUN pnpm install --frozen-lockfile --filter @ioes/ai-gateway...

# common-node phai build TRUOC. tsconfig cua ai-gateway co paths tro
# "@ioes/common-node" vao ma nguon, nhung tsc KHONG viet lai lenh require khi
# sinh ma: dist/.../main.js van `require("@ioes/common-node")` va luc chay se
# phan giai qua node_modules -> libs/common-node -> "main": dist/index.js.
# Khong build thu vien thi container chet ngay khi khoi dong voi
# "Cannot find module '@ioes/common-node'".
RUN pnpm --filter @ioes/common-node build \
 && pnpm --filter @ioes/ai-gateway build

# Bo devDependencies sau khi da build xong (nest-cli, typescript, jest, eslint).
RUN pnpm install --frozen-lockfile --prod --filter @ioes/ai-gateway...

# ---------- Runtime ----------
FROM node:20-alpine AS runtime

# Giu NGUYEN cay thu muc /workspace cua builder. pnpm dung node-linker mac dinh
# (isolated): services/ai-suite/api-gateway/node_modules chi chua symlink TUYET
# DOI tro vao /workspace/node_modules/.pnpm/... va /workspace/libs/common-node.
# Copy mot minh thu muc node_modules cua service sang /app se cho ra mot dong
# symlink gay, va container chet voi "Cannot find module 'axios'".
WORKDIR /workspace/services/ai-suite/api-gateway
ENV NODE_ENV=production

RUN addgroup -S ioes && adduser -S ioes -G ioes

COPY --from=builder --chown=ioes:ioes /workspace/node_modules /workspace/node_modules
COPY --from=builder --chown=ioes:ioes /workspace/package.json /workspace/pnpm-workspace.yaml /workspace/
COPY --from=builder --chown=ioes:ioes /workspace/libs/common-node /workspace/libs/common-node
COPY --from=builder --chown=ioes:ioes /workspace/services/ai-suite/api-gateway/package.json ./package.json
COPY --from=builder --chown=ioes:ioes /workspace/services/ai-suite/api-gateway/node_modules ./node_modules
COPY --from=builder --chown=ioes:ioes /workspace/services/ai-suite/api-gateway/dist ./dist

USER ioes
EXPOSE 9100

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:9100/health || exit 1

# Duong dan long nhau vi tsc lay rootDir chung cua src/ va libs/common-node/src.
CMD ["node", "dist/services/ai-suite/api-gateway/src/main.js"]
