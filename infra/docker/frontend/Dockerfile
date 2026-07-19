# syntax=docker/dockerfile:1
# Build-Kontext ist das Repo-Root (pnpm-Workspace), z.B.:
#   docker build -f infra/docker/frontend/Dockerfile -t dorfpartys/frontend .
#
# @dorfpartys/shared ist eine echte Laufzeit-Abhängigkeit des Frontends
# (Zod-Schemas, URL-Builder); @dorfpartys/backend wird nur type-only importiert
# (AppRouter) und beim SSR-Build weggetreeshaked. Damit `workspace:*` im
# Runtime-Image auflösbar bleibt, behält das Image den pnpm-Workspace-Kontext
# statt die Pakete einzeln zu kopieren.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY shared/package.json ./shared/package.json
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY shared ./shared
COPY backend ./backend
COPY frontend ./frontend
RUN pnpm --filter @dorfpartys/shared build && pnpm --filter @dorfpartys/backend build
RUN pnpm --filter frontend build

FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY shared/package.json ./shared/package.json
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --frozen-lockfile --prod --filter frontend...

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/shared/package.json ./shared/package.json
COPY --from=prod-deps /app/backend/package.json ./backend/package.json
COPY --from=prod-deps /app/frontend/package.json ./frontend/package.json
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/frontend/build ./frontend/build
WORKDIR /app/frontend
EXPOSE 3000
CMD ["node", "build/index.js"]
