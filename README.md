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
pnpm db:migrate
pnpm db:seed                      # Bundesland/Kreis-Stammdaten (DE/AT/CH) + Party-Arten
pnpm dev                          # startet frontend + backend parallel
```

Weitere Scripts: `pnpm check` (Typecheck aller Workspaces), `pnpm test` (Resolver-Unit-Tests im Backend), `pnpm build`.

## Deployment

Läuft auf einem selbstverwalteten Kubernetes-Cluster. Manifeste liegen in `/infra/k8s` (separate Deployments für `frontend` und `backend`, gemeinsames Ingress, Postgres über CloudNativePG — siehe `infra/k8s/README.md`). Dockerfiles für beide Apps liegen in `/infra/docker` (Repo-Root als Build-Kontext, wegen pnpm-Workspace). CI-Pipeline zum Bauen/Pushen der Images ist noch nicht Teil dieses Repos.

## Aktueller Stand

Technisches Fundament ist als Erstimplementierung durchgängig vorhanden: URL-Resolver (inkl. 301-Kanonisierung, gegen alle Beispiel-URLs aus AGENTS.md 1.2 getestet), Drizzle-Datenmodell + Migration + Seed, Authentik-JWT-Auth mit Rollen-Mapping, tRPC-Router für Events (Draft → Review → Approve/Reject inkl. Slug-Vergabe), Taxonomie, Profile und Uploads, SvelteKit-SSR-Routing mit dynamischem robots-Meta und JSON-LD, OIDC-Login-Flow, sowie K8s-Manifeste/Dockerfiles. Kein Design/Styling in dieser Phase.

Verbleibende offene Punkte (u. a. vollständiger Kreis-Import, finale Party-Art-Liste, konkrete Authentik-Gruppennamen, Sitemap-Cache/Trigger) stehen in [`AGENTS.md` Abschnitt 10](./AGENTS.md#10-offene-punkte-vorwährend-implementierung-zu-klären).

Für alle Architektur-Entscheidungen, das vollständige Datenmodell und verbindliche Implementierungsregeln: [`AGENTS.md`](./AGENTS.md).
