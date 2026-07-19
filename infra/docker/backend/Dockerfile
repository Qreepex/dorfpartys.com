# syntax=docker/dockerfile:1
# Build-Kontext ist das Repo-Root (pnpm-Workspace), z.B.:
#   docker build -f infra/docker/backend/Dockerfile -t dorfpartys/backend .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY shared/package.json ./shared/package.json
COPY backend/package.json ./backend/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY shared ./shared
COPY backend ./backend
RUN pnpm --filter @dorfpartys/shared build && pnpm --filter @dorfpartys/backend build

FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY shared/package.json ./shared/package.json
COPY backend/package.json ./backend/package.json
RUN pnpm install --frozen-lockfile --prod --filter @dorfpartys/backend...

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/shared/package.json ./shared/package.json
COPY --from=prod-deps /app/backend/package.json ./backend/package.json
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/backend/dist ./backend/dist
WORKDIR /app/backend
EXPOSE 3000
CMD ["node", "dist/index.js"]
