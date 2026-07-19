# AGENTS.md

Kontext-Dokument für Agenten, die an der Implementierung von dorfpartys.com arbeiten. Beschreibt bereits getroffene Architektur-Entscheidungen — bitte als Vorgabe behandeln und nicht neu zur Diskussion stellen, sofern nicht explizit anders angewiesen.

## Projektüberblick

dorfpartys.com ist eine DACH-weite (Deutschland/Österreich/Schweiz) Plattform zum Finden und Eintragen von Partys, mit Fokus auf lokale Veranstaltungen (Schützenfeste, Zeltfeten, Scheunenfeten, Stoppelfeten etc.). Kernanforderung: sehr granulare, SEO-indizierbare Filter-URLs (Geografie × Party-Art × Monat), nach Vorbild von Faceted-Navigation-Portalen wie Zalando.

**Scope dieser Phase:** ausschließlich technisches Fundament — Routing, Datenmodell, Auth, Nutzerprofile, Review-Workflow, SEO-Grundgerüst. Kein UI-Design/Styling.

## 0. Repo-Struktur (Monorepo)

```
/frontend
  src/
    routes/
      [country]/
        [...segments]/+page.server.ts   # ruft backend.resolve() auf, rendert oder redirected
        party/[slug]/+page.server.ts     # ruft backend.events.getBySlug() auf
        review/                          # Moderations-Dashboard (geschützt: moderator/admin)
        submit/                          # Event-Einreichungsformular (geschützt: eingeloggt)
        profil/                          # Nutzerprofil-Editor (geschützt: eingeloggt)
      sitemap-index.xml/, sitemap-[...].xml/
    lib/
      trpc-client/                       # tRPC-Client, importiert AppRouter-Typ (type-only) aus /backend
      components/
  static/

/backend
  src/
    routers/                             # tRPC-Router: resolver, events, taxonomy, users, review, uploads, sitemap
    db/
      schema.ts                          # Drizzle-Schema
      migrations/
      seed/                              # Bundesland/Kreis-Stammdaten, Party-Arten
    resolver/                            # Segment-Resolver + Canonical-Redirect-Logik (siehe Abschnitt 1)
    slug/                                # Slug-Registry, Kollisions-Handling
    auth/                                # Authentik-JWT-Verifizierung (JWKS), Rollen-Mapping
    storage/                             # IONOS-S3-Client (presigned Upload-URLs für Fotos/Profilbilder)
    seo/                                 # Sitemap-Datenaufbereitung, JSON-LD-Helper

/shared
  types/                                 # Event, User, UserProfile, Bundesland, Kreis, PartyArt, etc.
  schemas/                               # Zod-Schemas (Event-Einreichung, Profil, Resolver-Input) – von tRPC-Routern
                                          # im Backend UND für Client-seitige Formvalidierung im Frontend genutzt
  constants/                             # Monats-Liste, kanonische Segment-Reihenfolge
  url/                                   # reine Funktionen zum Bauen kanonischer URLs (kein DB-Zugriff)

/infra/k8s
  frontend/                              # Deployment, Service
  backend/                               # Deployment, Service
  ingress/                               # gemeinsames Ingress, TLS
  postgres/                              # StatefulSet oder Operator-Config (z.B. CloudNativePG)
```

Package-Manager: **pnpm workspaces** (`pnpm-workspace.yaml` bindet frontend/backend/shared zusammen). Kommunikation frontend → backend läuft **intern im Cluster** (K8s-Service-DNS), nicht über die öffentliche Domain.

Warum tRPC: Frontend und Backend sind beide TypeScript im selben Monorepo — der Frontend-Workspace importiert den `AppRouter`-Typ **nur als Typ** aus `/backend` (kein Laufzeit-Coupling), dadurch volle Typsicherheit zwischen Event-/Resolver-/Profil-Endpunkten ohne manuell gepflegtes OpenAPI-Schema. Zod-Schemas für Input-Validierung liegen in `/shared`, damit Frontend-Formulare dieselbe Validierung vor dem Absenden ausführen können wie das Backend.

## 1. URL-Architektur

Resolver-Logik läuft **im Backend** (braucht DB-Zugriff auf Slug-Registry). Frontend ruft in `+page.server.ts` den tRPC-Endpunkt `resolver.resolve({ country, segments })` auf, der entweder `{ redirect: url }` (→ SvelteKit `redirect(301, url)`) oder `{ filters, results }` zurückgibt.

### 1.1 Länder-Root

```
/de/
/at/
/ch/
```

Land ist immer das erste Pfadsegment. Eine Domain (`dorfpartys.com`) für den gesamten DACH-Raum — keine separaten ccTLDs.

### 1.2 Filter-Segmente (Suche/Browse)

Nach dem Land-Segment folgen 0–4 weitere Segmente in fester kanonischer Reihenfolge:

```
/{country}/{bundesland}/{kreis}/{art}/{monat}/
```

Alle folgenden Varianten müssen auflösbar sein:

```
/de/schleswig-holstein/ostholstein/schuetzenfeste/august/
/de/schleswig-holstein/ostholstein/schuetzenfeste/
/de/schleswig-holstein/ostholstein/august/
/de/schleswig-holstein/ostholstein/
/de/schleswig-holstein/august/
/de/schleswig-holstein/schuetzenfeste/
/de/schuetzenfeste/
/de/august/
```

Kein literales `/art/`- oder `/monat/`-Präfix. Welches Segment was bedeutet, wird über den Resolver anhand kontrollierter Vokabulare bestimmt, nicht über die Position.

### 1.3 Segment-Resolver

Vier kontrollierte Vokabulare, **global kollisionsfrei** (siehe 1.5):

| Vokabular | Beispiele | Herkunft |
|---|---|---|
| Bundesland | schleswig-holstein, bayern, ... | Stammdaten je Land |
| Kreis | ostholstein, ... | Stammdaten, referenziert ein Bundesland |
| Party-Art | schuetzenfeste, zeltfeten, scheunenfeten, stoppelfeten, ... | Admin-gepflegte Liste |
| Monat | januar … dezember | fest, 12 Werte |

Resolver-Logik (Pseudocode, Backend):

```
segments = path.split('/').filter(non_empty)   // nach dem Land-Segment
filters = {}

for segment in segments:
  if segment in Bundesland-Slugs:
    filters.bundesland = segment
  elif segment in Kreis-Slugs:
    filters.kreis = segment
    filters.bundesland_implied = lookup_bundesland_for_kreis(segment)
  elif segment in PartyArt-Slugs:
    filters.art = segment
  elif segment in Monat-Slugs:
    filters.monat = segment
  else:
    return 404

if filters.bundesland present AND filters.bundesland_implied present:
  if filters.bundesland != filters.bundesland_implied:
    return 404
```

### 1.4 Kanonisierung & Redirects (301)

Ziel: pro Inhalt genau **eine** indexierbare URL.

- **Kanonische Reihenfolge:** `bundesland → kreis → art → monat`. Jede andere Reihenfolge der vorhandenen Segmente → 301 zur kanonischen Reihenfolge.
- **Kreis impliziert Bundesland:** Ist ein Kreis-Segment vorhanden, muss die kanonische URL immer auch das zugehörige Bundesland enthalten. `/de/ostholstein/zeltfeten/` → 301 → `/de/schleswig-holstein/ostholstein/zeltfeten/`.
- **Monat ist evergreen**, kein Jahr im Pfad. Für ein konkretes Jahr: Query-Parameter `?jahr=2026` (nicht Teil der kanonischen URL).

### 1.5 Slug-Kollisionsvermeidung

Zentrale Slug-Registry (Backend, DB) mit Unique-Constraint über **alle vier Vokabulare hinweg** (Bundesland, Kreis, Party-Art, Monat). Beim Anlegen eines neuen Eintrags gegen die Registry prüfen; bei Kollision automatisch disambiguieren oder Anlage blockieren.

### 1.6 Indexierungsregeln

- Jede Filter-Kombination nur `index,follow`, wenn sie **mindestens ein aktuelles/kommendes Event** hat.
- Leere Kombinationen: **kein 404**, sondern normale Seite mit Hinweis und `noindex,follow`.
- `BreadcrumbList` JSON-LD auf allen Filter-/Suchseiten.

### 1.7 Event-Detailseiten (eigener URL-Baum)

```
/{country}/party/{slug}/
```

Beispiel: `/de/party/steinhorst-open-air/`

Entkoppelt von den vier Filter-Vokabularen (kein Kollisionsrisiko), einfacheres Routing. Ranking läuft über interne Verlinkung, `BreadcrumbList`- und `schema.org/Event`-Markup, nicht über URL-Tiefe.

- Slug = Event-Titel-Slug, bei Kollision Disambiguator anhängen (i. d. R. Ortsname): `dorffest` → `dorffest-eutin`.
- Slug-Vergabe (inkl. Kollisionsprüfung) passiert beim **Freischalten im Review**.
- Kein Datum im Pfad. Datum steckt in `schema.org/Event` (`startDate`).
- Wiederkehrende Veranstaltungen: dieselbe URL/Seite wird bei erneuter Einreichung aktualisiert statt jedes Jahr eine neue anzulegen.

### 1.8 Sitemaps

```
/sitemap-index.xml
/sitemap-{country}-orte.xml
/sitemap-{country}-arten.xml
/sitemap-events.xml
```

Segmentiert, dynamisch generiert (Backend, `seo`-Modul), nur URLs mit Content.

## 2. Datenmodell

```
bundesland      (id, slug, name, country [de|at|ch])
kreis           (id, slug, name, bundesland_id → bundesland)
party_art       (id, slug, name, active)
-- monat: fixes Enum/Lookup, kein dynamisches Anlegen

user (
  id, authentik_subject, email, role [user | moderator | admin],
  created_at
)

user_profile (
  user_id → user (1:1),
  display_name,                    -- öffentlich sichtbarer Name als "Veranstalter"
  avatar_s3_key,
  website_url,
  instagram_url,
  bio,
  updated_at
)

user_link (                        -- zusätzliche, frei erweiterbare Profil-Links (TikTok, Facebook, ...)
  id, user_id → user, url, label, position
)

event (
  -- Pflichtfelder
  id, slug, title,
  organizer_user_id → user,        -- "Veranstalter", wird über user_profile angezeigt
  description,
  start_date, end_date,
  bundesland_id → bundesland,      -- für die Suche/den Resolver
  kreis_id → kreis,                -- muss zu bundesland_id passen (validieren)
  address_description,             -- konkrete Adresse als Freitext vom User, NICHT für Suche/Resolver genutzt
  party_art_id → party_art,        -- Kategorie
  status [draft | in_review | approved | rejected],
  custom_color,                    -- Hex-Farbe für die Event-Seite, optional/nullable, Default gesetzt

  -- optionale Felder
  price_info,                      -- Freitext, z.B. "5€ VVK / 8€ AK", nullable
  min_age,                         -- int, nullable
  allows_muttizettel,            -- boolean, nullable, default false
  is_outdoor,                      -- boolean, nullable, default false
  tags,                            -- array, freeform
  custom_fields,                   -- jsonb, Catch-all für künftige Ad-hoc-Felder ohne Migration

  -- Meta
  created_by → user,
  approved_by → user (nullable), approved_at (nullable),
  created_at, updated_at
)

event_photo     (id, event_id → event, s3_key, position [1–3])   -- max. 3 pro Event
event_link      (id, event_id → event, url, label, position [1–3])  -- max. 3 pro Event,
                                                                       -- label z.B. "Veranstalter", "Website", "Instagram"

slug_registry   (slug, type [bundesland|kreis|party_art|monat], entity_id)   -- Unique-Constraint auf slug
```

Constraints/Validierung im Backend (nicht nur UI):

- Max. 3 Fotos, max. 3 Links pro Event.
- `bundesland_id`/`kreis_id` verpflichtend, aus Stammdaten gewählt (kein Freitext); `kreis_id` muss zu `bundesland_id` gehören.
- `address_description` verpflichtend, Freitext (nicht Teil des Resolvers/der Suche).
- Event erst nach `status = approved` öffentlich sichtbar/indexierbar.
- `custom_fields` ist bewusst ungetypter Escape-Hatch — häufig genutzte Ad-hoc-Felder sollen bei Bedarf in eigene Spalten migriert werden, nicht dauerhaft in `custom_fields` bleiben.

## 3. Nutzerprofile

- Jeder über SSO angelegte `user` kann ein `user_profile` anlegen/bearbeiten — wird als **Veranstalter** auf Event-Seiten angezeigt.
- Pflicht für Profil: keine (Profil ist optional, aber ohne `display_name` wird der User als Veranstalter nur mit generischem Platzhalter angezeigt — UI-Entscheidung, kein Blocker für Event-Einreichung).
- Felder: `display_name`, `avatar_s3_key` (Upload über Backend `storage`-Modul, presigned URL zu IONOS S3), `website_url`, `instagram_url`, `bio`, plus beliebig viele weitere über `user_link`.
- Profilbild-Upload läuft wie Event-Fotos über presigned Upload-URLs — kein direkter Client-Upload zu S3-Credentials.

## 4. Event-Customization

- Aktuell einzige Customization-Option: `custom_color` (Hex) für die Event-Detailseite, vom Einreicher beim Anlegen/Bearbeiten wählbar.
- Bewusst minimal gehalten — weitere Customization (Layout, Cover-Bild-Position etc.) ist expliziter Nicht-Scope dieser Phase.

## 5. Auth & Submission-Workflow

- **SSO via Authentik**, OpenID Connect.
- **Frontend** übernimmt den OIDC-Login-Flow (Authorization Code) und hält die Session (httpOnly-Cookie).
- **Backend** verifiziert eingehende Requests anhand des von Authentik ausgestellten JWT (Verifizierung über Authentik-JWKS-Endpoint, zustandslos). Rollen (`user`/`moderator`/`admin`) werden aus Authentik-Gruppen/Claims gemappt.
- Rollen: `user` (einreichen/eigenes Profil & eigene Events bearbeiten), `moderator`/`admin` (Review-Dashboard unter `/review`).
- Einreichungsformular: Titel, Beschreibung, Start-/Enddatum, Bundesland, Kreis, Adress-Beschreibung, Party-Art, max. 3 Fotos, max. 3 Links, optionale Felder (Preis, Altersbeschränkung/Muttizettel, Open Air, Tags, ...), Farbe.
- Status-Flow: `draft` → `in_review` → `approved` (öffentlich) oder `rejected`.
- Slug-Generierung + Kollisions-Disambiguierung findet beim Approve-Schritt statt, nicht bei Einreichung.

## 6. SEO-Implementierungsregeln (verbindlich)

- **Alle öffentlichen Seiten serverseitig gerendert** (SvelteKit SSR), kein Client-only-Rendering für crawlbaren Content.
- Robots-Meta dynamisch: `index,follow` nur bei Treffern > 0, sonst `noindex,follow`.
- `schema.org/Event` JSON-LD auf jeder Event-Seite.
- `BreadcrumbList` JSON-LD auf Filter- und Event-Seiten.
- Filter-/Suchseiten verlinken Events als serverseitig gerenderte `<a href>`.
- 301-Redirects für alle nicht-kanonischen Segment-Reihenfolgen (siehe 1.4).

## 7. Domains & Storage

- Hauptdomain: `dorfpartys.com` — Land als Pfadsegment, nicht als ccTLD.
- Optional als Marketing-/Redirect-Domain: `dorf.party`.
- Kurzlink-Domain für Event-Shares: `dp.gg`, z. B. `dp.gg/schuetzenfest-eutin`.
- Objektspeicher: **IONOS S3** (S3-kompatible API) über `speicher.dorfpartys.com`, für Event-Fotos und Profilbilder. Backend spricht ausschließlich über presigned URLs mit dem Bucket — Zugangsdaten bleiben serverseitig.

### 7.1 S3-Struktur

Bucket ist **public-read** (Fotos sind ohnehin öffentlich sichtbar), aber **nicht public-write** — Uploads laufen ausschließlich über presigned PUT-URLs vom Backend.

```
events/{event_id}/{event_photo_id}.{ext}
profiles/{user_id}/{avatar_id}.{ext}
```

- Key basiert auf `event_id` (UUID), **nicht** auf dem Slug — der Slug existiert erst nach Approval (siehe 1.7), Fotos werden aber schon beim Einreichen hochgeladen.
- `event_photo_id`/`avatar_id` sind UUIDs → Pfade sind unerratbar, relevant weil auch Fotos von noch nicht freigeschalteten Events (`draft`/`in_review`) technisch unter ihrer URL abrufbar sind, sobald hochgeladen.
- Bei jedem Foto-/Avatar-Austausch wird ein **neuer Key** erzeugt (kein Overwrite) → ermöglicht `Cache-Control: public, max-age=31536000, immutable`.
- Presigned-URL-Erstellung im Backend validiert Content-Type (nur `image/jpeg`, `image/png`, `image/webp`) und Dateigröße, bevor die URL ausgestellt wird.
- Beim Löschen/Ersetzen eines Fotos entfernt das Backend aktiv den alten S3-Key (keine verwaisten öffentlichen Dateien).
- Öffentliche Lese-URL: `https://speicher.dorfpartys.com/{key}` — kein Signing nötig für GET.

## 8. Tech-Stack (verbindlich für diese Phase)

- **Frontend:** SvelteKit (TypeScript), Node-Adapter für containerisiertes K8s-Deployment
- **Backend:** Node.js, Fastify + tRPC
- **Datenbank:** PostgreSQL + Drizzle ORM (im Backend)
- **Shared:** Zod-Schemas, TS-Typen, reine URL-Builder-Funktionen
- **Auth:** Authentik via OpenID Connect (Login im Frontend, Token-Verifizierung im Backend)
- **Objektspeicher:** IONOS S3 über `speicher.dorfpartys.com`
- **Deployment:** Kubernetes, eigenes Cluster, Manifeste in `/infra/k8s`

## 9. Nicht-Ziele in dieser Phase

- Kein UI-Design, kein Styling, kein Branding (außer der einen Farb-Option pro Event).
- Keine E-Mail-Benachrichtigungen (Review-Status etc.) — Hook/Stelle im Code vorsehen, nicht implementieren.
- Keine Bezahlfunktionen/Promotion von Events.
- Keine weiteren Event-Customization-Optionen außer Farbe.

## 10. Offene Punkte (vor/während Implementierung zu klären)

- Vollständige Bundesland/Kreis-Stammdaten für DE/AT/CH importieren (z. B. Destatis/GeoNames). **Teilweise erledigt:** Seed-Skript (`backend/src/db/seed/`) legt alle 16 DE-Bundesländer, 9 AT-Bundesländer und 7 CH-Kantone plus je 1–3 Platzhalter-Kreise an — kein vollständiger Kreis-Import.
- Finale Liste der Party-Arten festlegen (Startpunkt: Schützenfest, Zeltfete, Scheunenfete, Stoppelfete). **Startliste umgesetzt** (`shared/src/constants/index.ts` → `PARTY_ART_SEED`), finale Liste weiterhin offen.
- Vollständige Liste optionaler Event-Felder über `custom_fields` hinaus abstimmen (aktuell: Preis, Altersbeschränkung/Muttizettel, Open Air als dedizierte Spalten).
- Rollen-Mapping Authentik-Gruppen → App-Rollen (`user`/`moderator`/`admin`) konkret definieren. **Mechanismus umgesetzt** (`backend/src/auth/roles.ts`, Gruppennamen über `AUTHENTIK_ADMIN_GROUP`/`AUTHENTIK_MODERATOR_GROUP` konfigurierbar), konkrete Gruppennamen in der echten Authentik-Instanz weiterhin offen.
- Sitemap-Generierungs-Trigger festlegen (Cronjob im Cluster vs. on-demand bei Event-Änderung). **Aktuell:** on-demand, ohne Caching — jeder Aufruf von `/sitemap-*.xml` fragt live gegen die DB ab (`backend/src/seo/sitemap.ts`). Für Produktionslast ggf. Cronjob + Cache/S3-Ablage nachziehen.

### Bekannter Implementierungsstand vs. aktueller Spezifikation

- **`allows_muttizettel`** (Abschnitt 2): umgesetzt (Drizzle-Schema/Migration, Zod-Schema, Typen, Submit-/Detailseite). Migrationshistorie wurde dabei auf eine einzige saubere Erstmigration zurückgesetzt, da noch kein echtes Deployment mit Daten existiert.
- **S3-Struktur** (Abschnitt 7.1): umgesetzt — `events/{event_id}/{event_photo_id}.{ext}` bzw. `profiles/{user_id}/{avatar_id}.{ext}` (`backend/src/storage/presign.ts`), Dateigrößen-Validierung (Server-seitiger Grenzwert-Check auf den vom Client angegebenen Wert — SigV4-presignte PUT-URLs erzwingen keine Content-Length-Range kryptographisch) sowie aktives Löschen alter S3-Keys beim Ersetzen eines Event-Fotos/Avatars (`backend/src/storage/delete.ts`). Die Event-ID wird dafür vom Client vor `events.create` generiert (`submitEventInputSchema.id`) — ein clientseitiges Upload-Widget (Datei-Picker + presigned PUT) ist noch **nicht** gebaut, nur die Backend-Endpunkte (`uploads.requestEventPhotoUploadUrl`/`requestAvatarUploadUrl`).
- **E-Mail-Benachrichtigungs-Hook** (Abschnitt 9): Kommentar an beiden Review-Entscheidungen ergänzt (`backend/src/routers/events.ts`, `review`-Mutation).
- **Marketing-/Kurzlink-Domains** `dorf.party`/`dp.gg` (Abschnitt 7): rein informativ, keine Kurzlink-Generierung o. Ä. implementiert oder in dieser Phase vorgesehen.
