# --- Stage 1: Build Phase ---
FROM node:24-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Monorepo-Konfigurationen und Lockfile kopieren
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY shared/ ./shared/
COPY backend/package.json backend/tsconfig.json ./backend/

# Nur die Abhängigkeiten installieren, die für das Backend (und shared) nötig sind
RUN pnpm install --filter @dorfpartys/backend... --frozen-lockfile

# Backend Quellcode kopieren
COPY backend/src/ ./backend/src/
COPY backend/scripts/ ./backend/scripts/

# TypeScript Build ausführen (erzeugt backend/dist)
RUN pnpm --filter ./backend build

# DevDependencies entfernen, um Image klein zu halten
RUN CI=true pnpm install --prod --filter @dorfpartys/backend... --frozen-lockfile

# --- Stage 2: Runtime Phase ---
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Nur produktionsrelevante Dateien kopieren
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/shared ./shared

EXPOSE 5000

# Startet das kompilierte Fastify Backend
CMD ["node", "backend/dist/index.js"]