# dorfpartys.com

DACH-weite Plattform zum Finden und Eintragen von (Dorf-)Partys – Schützenfeste, Zeltfeten, Scheunenfeten, Stoppelfeten und mehr. Durchsuchbar nach Land, Bundesland, Kreis, Party-Art und Monat über SEO-optimierte, kombinierbare Filter-URLs.

## Über das Projekt

Nutzer loggen sich per SSO (Authentik) ein, pflegen ein öffentliches Veranstalter-Profil und reichen eigene Veranstaltungen ein. Jede Einreichung durchläuft eine kurze redaktionelle Prüfung (Review), bevor sie öffentlich sichtbar und indexierbar wird.

**Aktuelle Phase:** ausschließlich technisches Fundament – Routing/URL-Architektur, Datenmodell, Auth, Nutzerprofile, Review-Workflow, SEO-Grundgerüst. Design/UI/Branding folgen bewusst später.

Die vollständige technische Spezifikation für die Implementierung (URL-Resolver-Logik, Datenmodell, verbindliche SEO-Regeln) steht in [`AGENTS.md`](./AGENTS.md) – vor dem Start der Implementierung lesen.

## Repo-Struktur

Monorepo mit vier Workspaces:

```
/frontend    SvelteKit (TypeScript), SSR, ruft das Backend intern auf
/backend     Node.js + Fastify + tRPC, Drizzle ORM, Geschäftslogik & DB-Zugriff
/shared      Zod-Schemas, TS-Typen, kanonische URL-Builder – von frontend & backend genutzt
/infra/k8s   Kubernetes-Manifeste (Deployment/Service/Ingress) für das eigene Cluster
```

Details zur internen Struktur jedes Workspace stehen in [`AGENTS.md`](./AGENTS.md#0-repo-struktur-monorepo).

## Tech-Stack

- **Frontend:** SvelteKit (TypeScript), serverseitiges Rendering für alle öffentlichen Seiten
- **Backend:** Node.js, Fastify + tRPC (typsicherer API-Layer zwischen frontend und backend)
- **Datenbank:** PostgreSQL + Drizzle ORM (im Backend-Workspace)
- **Auth:** SSO via Authentik (OpenID Connect)
- **Objektspeicher:** IONOS S3 (S3-kompatibel) über `speicher.dorfpartys.com`, für Event-Fotos und Profilbilder
- **Deployment:** Kubernetes (eigenes Cluster), Manifeste in `/infra/k8s`

## Setup / Lokale Entwicklung

Voraussetzungen: Node.js 20+, pnpm, Docker (lokale Postgres-Instanz – S3 läuft bei IONOS, kein lokales MinIO nötig), Zugriff auf eine Authentik-Instanz (oder Dev-Mock).

```bash
cp .env.example .env
# DATABASE_URL, AUTHENTIK_ISSUER, AUTHENTIK_CLIENT_ID/SECRET,
# S3_ENDPOINT=https://speicher.dorfpartys.com, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY

docker compose up -d postgres     # nur Postgres lokal
pnpm install                      # installiert alle Workspaces
pnpm --filter backend db:migrate
pnpm --filter backend db:seed     # Bundesland/Kreis-Stammdaten + Party-Arten
pnpm dev                          # startet frontend + backend parallel
```

## Deployment

Läuft auf einem selbstverwalteten Kubernetes-Cluster. Manifeste liegen in `/infra/k8s` (separate Deployments für `frontend` und `backend`, gemeinsames Ingress, Postgres z. B. über einen Operator wie CloudNativePG). CI baut die Docker-Images für `frontend` und `backend` getrennt und rollt sie aus.

## Aktueller Stand

Technisches Fundament in Aufbau: URL-Resolver, Datenmodell, Auth, Nutzerprofile, Review-Workflow, SEO-Grundgerüst. Kein Design/Styling in dieser Phase.

Für alle Architektur-Entscheidungen, das vollständige Datenmodell und verbindliche Implementierungsregeln: [`AGENTS.md`](./AGENTS.md).
