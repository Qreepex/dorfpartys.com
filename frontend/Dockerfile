# --- Stage 1: Build Phase ---
FROM node:24-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 1. Nur Lockfile kopieren, um den globalen pnpm-Store zu befüllen
COPY pnpm-lock.yaml ./

# Holt alle Pakete in den Store (ermöglicht echtes Offline-Installieren im Monorepo)
RUN pnpm fetch

# 2. Den restlichen Code für den Build kopieren
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY shared/ ./shared/
COPY frontend/ ./frontend/

# Installiert alle Abhängigkeiten (inkl. devDependencies für den Build) direkt aus dem Store
RUN pnpm install --offline --frozen-lockfile

# SvelteKit App bauen
RUN pnpm --filter @dorfpartys/frontend build

# 3. DevDependencies entfernen, aber pnpm zwingen, die node_modules physisch auszupacken
RUN CI=true pnpm install --prod --offline --frozen-lockfile

# --- Stage 2: Runtime Phase ---
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Wir kopieren die flachen node_modules aus dem Root sowie das gebaute Frontend
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/frontend/package.json ./frontend/package.json
COPY --from=builder /app/frontend/node_modules ./frontend/node_modules
COPY --from=builder /app/frontend/build ./frontend/build

EXPOSE 3000

CMD ["node", "frontend/build/index.js"]