# AGENTS.md

Kontext-Dokument für Agenten, die an der Implementierung von dorfpartys.com arbeiten. Beschreibt bereits getroffene Architektur-Entscheidungen - bitte als Vorgabe behandeln und nicht neu zur Diskussion stellen, sofern nicht explizit anders angewiesen.

## Projektüberblick

dorfpartys.com ist eine DACH-weite (Deutschland/Österreich/Schweiz) Plattform zum Finden und Eintragen von Partys, mit Fokus auf lokale Veranstaltungen (Schützenfeste, Zeltfeten, Scheunenfeten, Stoppelfeten etc.). Kernanforderung: sehr granulare, SEO-indizierbare Filter-URLs (Geografie × Party-Art), nach Vorbild von Faceted-Navigation-Portalen wie Zalando. Zeitfilter (Monate) werden via Fragment-IDs für semantische Grouping und Google Sitelinks genutzt, nicht in URL-Pfaden.

**Scope dieser Phase:** ausschließlich technisches Fundament - Routing, Datenmodell, Auth, Nutzerprofile, Review-Workflow, SEO-Grundgerüst. Kein UI-Design/Styling.

## 0. Repo-Struktur (Monorepo)

```
/frontend
  src/
    routes/
      [country]/
        [...segments]/+page.server.ts   # ruft backend.resolve() auf, rendert oder redirected
        veranstaltung/[slug]/+page.server.ts     # ruft backend.events.getBySlug() auf
        review/                          # Moderations-Dashboard (geschützt: moderator/admin)
        submit/                          # Event-Einreichungsformular (geschützt: eingeloggt)
        profil/                          # Nutzerprofil-Editor (geschützt: eingeloggt)
      sitemap.xml/, sitemap-[...].xml/
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
  constants/                             # Monats-Konstanten (Frontend-only für Rendering), kanonische Segment-Reihenfolge
  url/                                   # reine Funktionen zum Bauen kanonischer URLs (kein DB-Zugriff)

/infra/k8s
  frontend/                              # Deployment, Service
  backend/                               # Deployment, Service
  ingress/                               # gemeinsames Ingress, TLS
  postgres/                              # StatefulSet oder Operator-Config (z.B. CloudNativePG)
```

Package-Manager: **pnpm workspaces** (`pnpm-workspace.yaml` bindet frontend/backend/shared zusammen). Kommunikation frontend → backend läuft **intern im Cluster** (K8s-Service-DNS), nicht über die öffentliche Domain.

Warum tRPC: Frontend und Backend sind beide TypeScript im selben Monorepo - der Frontend-Workspace importiert den `AppRouter`-Typ **nur als Typ** aus `/backend` (kein Laufzeit-Coupling), dadurch volle Typsicherheit zwischen Event-/Resolver-/Profil-Endpunkten ohne manuell gepflegtes OpenAPI-Schema. Zod-Schemas für Input-Validierung liegen in `/shared`, damit Frontend-Formulare dieselbe Validierung vor dem Absenden ausführen können wie das Backend.

## 1. URL-Architektur (Phase 2 Refactor: Monate aus URLs entfernt)

Resolver-Logik läuft **im Backend** (braucht DB-Zugriff auf Slug-Registry). Frontend ruft in `+page.server.ts` den tRPC-Endpunkt `resolver.resolve({ country, segments })` auf, der entweder `{ redirect: url }` (→ SvelteKit `redirect(301, url)`) oder `{ filters, results }` zurückgibt.

### 1.1 Länder-Root

```
/de/
/at/
/ch/
```

Land ist immer das erste Pfadsegment. Eine Domain (`dorfpartys.com`) für den gesamten DACH-Raum - keine separaten ccTLDs.

### 1.2 Filter-Segmente (Suche/Browse) – Monate als Fragment, nicht Path

Nach dem Land-Segment folgen 0–3 weitere Segmente in fester kanonischer Reihenfolge (max 3 statt vorher 4):

```
/{country}/{bundesland}/{kreis}/{art}/
```

Alle folgenden Varianten müssen auflösbar sein:

```
/de/schleswig-holstein/ostholstein/schuetzenfeste/    # 3 Filter
/de/schleswig-holstein/ostholstein/                   # 2 Filter
/de/schleswig-holstein/schuetzenfeste/                # 2 Filter
/de/schleswig-holstein/                               # 1 Filter
/de/schuetzenfeste/                                   # 1 Filter
/de/                                                   # Root (alle Filter)
```

**Monate werden nicht in Pfaden kodiert.** Stattdessen:

- Seiten laden alle kommenden + letzten 12 Monate archivierter Events
- Frontend gruppiert Events nach Monat mit semantischen `<h2 id="august">August</h2>` Überschriften
- Nutzer clicfen auf Month-Badges → scrollen zu `#august` (Fragment wird in URL angehängt: `/de/schleswig-holstein/#august`)
- Google indexiert die Main-URL und erkennt Sitelink-Opportunities über die Monat-Überschriften

Kein literales `/art/`-Präfix. Welches Segment was bedeutet, wird über den Resolver anhand kontrollierter Vokabulare bestimmt, nicht über die Position.

### 1.3 Segment-Resolver

Drei kontrollierte Vokabulare, **global kollisionsfrei** (siehe 1.5):

| Vokabular  | Beispiele                                                   | Herkunft                                |
| ---------- | ----------------------------------------------------------- | --------------------------------------- |
| Bundesland | schleswig-holstein, bayern, ...                             | Stammdaten je Land                      |
| Kreis      | ostholstein, ...                                            | Stammdaten, referenziert ein Bundesland |
| Party-Art  | schuetzenfeste, zeltfeten, scheunenfeten, stoppelfeten, ... | Admin-gepflegte Liste                   |

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
  else:
    return 404

if filters.bundesland present AND filters.bundesland_implied present:
  if filters.bundesland != filters.bundesland_implied:
    return 404
```

**Monate-Segmente werden 404** (nicht mehr akzeptiert).

### 1.4 Kanonisierung & Redirects (301)

Ziel: pro Inhalt genau **eine** indexierbare URL.

- **Kanonische Reihenfolge:** `bundesland → kreis → art` (Monate nicht in Reihenfolge). Jede andere Reihenfolge der vorhandenen Segmente → 301 zur kanonischen Reihenfolge.
- **Kreis impliziert Bundesland:** Ist ein Kreis-Segment vorhanden, muss die kanonische URL immer auch das zugehörige Bundesland enthalten. `/de/ostholstein/zeltfeten/` → 301 → `/de/schleswig-holstein/ostholstein/zeltfeten/`.
- **Monate sind evergreen:** Alle Events der Saison (kommend + 12 Monate Archiv) auf einer URL; Fragment-Scrolling für Monat-Navigation.

### 1.5 Slug-Kollisionsvermeidung

Zentrale Slug-Registry (Backend, DB) mit Unique-Constraint über **drei Vokabulare** (Bundesland, Kreis, Party-Art). Monate nicht in Registry (keine Slugs für Monate). Beim Anlegen eines neuen Eintrags gegen die Registry prüfen; bei Kollision automatisch disambiguieren oder Anlage blockieren.

### 1.6 Indexierungsregeln (Dynamic Soft-404s)

- **Dynamisches `indexable`-Flag:** Seiten mit **null Events (future + 12-month archive = 0)** bekommen `<meta name="robots" content="noindex, follow">` um Soft-404-Meldungen in Search Console zu vermeiden. Seiten mit mindestens einem Event (egal ob aktuell oder archiviert) bleiben `index,follow`.
- **Archiv-Integration:** Vergangene Events der letzten 12 Monate werden auf Filter-Seiten sichtbar gemacht, um leere Seiten in der Nebensaison zu vermeiden.
- **Leere Kombinationen:** Kein 404, sondern normale Seite mit Hinweis (Call-to-Action zum Eintragen).
- Jede Segment-Kombination hat serverseitig gebauten, eindeutigen SEO-Text (Title/Description/H1/Intro) aus den Klarnamen der Filter - `backend/src/seo/search-copy.ts`, ausgeliefert über `resolver.resolve`.
- `BreadcrumbList` JSON-LD auf allen Filter-/Suchseiten (max 3 Items: Country → Bundesland → Kreis/Art).

### 1.7 Event-Detailseiten (eigener URL-Baum)

```
/{country}/veranstaltung/{slug}/
```

Beispiel: `/de/veranstaltung/steinhorst-open-air/`

Entkoppelt von den drei Filter-Vokabularen (kein Kollisionsrisiko), einfacheres Routing. Ranking läuft über interne Verlinkung, `BreadcrumbList`- und `schema.org/Event`-Markup, nicht über URL-Tiefe.

- Slug = Event-Titel-Slug, bei Kollision Disambiguator anhängen (i. d. R. Ortsname): `dorffest` → `dorffest-eutin`.
- Slug-Vergabe (inkl. Kollisionsprüfung) passiert beim **Freischalten im Review**.
- Kein Datum im Pfad. Datum steckt in `schema.org/Event` (`startDate`).
- Wiederkehrende Veranstaltungen: dieselbe URL/Seite wird bei erneuter Einreichung aktualisiert statt jedes Jahr eine neue anzulegen.

### 1.8 Sitemaps (Phase 2: Split per Country + Bundesland)

```
/sitemap.xml                                 (Sitemap Index, dynamisch)
├── /sitemap-pages.xml                       (statische Seiten)
├── /sitemap-events.xml                      (Event-Detailseiten)
├── /sitemap-veranstalter.xml                (Organisator-Profile)
├── /sitemap-{country}-orte.xml              (Bundesland only + Bundesland+Kreis)
├── /sitemap-{country}-arten.xml             (Art only)
├── /sitemap-{country}-filter-combinations-level2.xml   (BL+Art)
└── /sitemap-{country}-{bundesland}-level3.xml  [DYNAMISCH pro Bundesland]  (BL+Kreis+Art)
```

Segmentiert, dynamisch generiert (Backend, `seo`-Modul). `sitemap-pages.xml` deckt die statischen Seiten ab (Startseite, Länder-Roots, Impressum/Datenschutz/Nutzungsbedingungen). Jede URL erscheint in genau einer Sitemap: orte.xml liefert Bundesland-only (immer) und Bundesland+Kreis (>=1 Event) aus, arten.xml Art-only (>=1 Event); es gibt bewusst keine eigene level1-Sitemap dafür, das wäre deckungsgleich mit orte/arten gewesen. Level2 (nur noch BL+Art) ist pro Country. Level3 ist per Bundesland, um unter 50k URLs pro Sitemap zu bleiben.

**URL-Reduktion durch Monat-Entfernung:** ~200k URLs → ~15-20k URLs (93% Reduktion).

## 2. Datenmodell

```
bundesland      (id, slug, name, country [de|at|ch])
kreis           (id, slug, name, bundesland_id → bundesland)
party_art       (id, slug, name, active)

user (
  id, authentik_subject, role [user | moderator | admin],
  onboarding_completed_at,          -- null = Registrierungs-Flow (Abschnitt 5) noch nicht durchlaufen/übersprungen
  created_at
)

user_profile (
  user_id → user (1:1),
  slug,                             -- vergeben aus display_name, öffentliche Seite /veranstalter/{slug}/
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
  organizer_user_id → user (nullable),  -- "Veranstalter" (User), wird über user_profile angezeigt;
                                         -- nullable wenn organizer_name gesetzt (Freitext-Veranstalter)
  organizer_name text (nullable),       -- Veranstalter als Freitext (wenn kein User-Profil)
  organizer_verified boolean,           -- zeigt an, ob der aktuelle Veranstalter verifiziert ist
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
  tags,                            -- array, freeform
  custom_fields,                   -- jsonb, Catch-all für künftige Ad-hoc-Felder ohne Migration

  -- Meta
  created_by → user,
  approved_by → user (nullable), approved_at (nullable),
  created_at, updated_at
)

event_claim (                      -- Claim-Workflow für Veranstalter-Übernahme von nicht-verifizierten Events
  id, event_id → event, claimed_by_user_id → user,
  status [pending | approved | rejected],
  reason text (nullable),          -- optionale Begründung warum man das Event claim will
  requested_at, reviewed_by → user (nullable), reviewed_at (nullable)
)

event_photo     (id, event_id → event, s3_key, position [1–3])   -- max. 3 pro Event
event_link      (id, event_id → event, url, label, position [1–3])  -- max. 3 pro Event,
                                                                       -- label z.B. "Veranstalter", "Website", "Instagram"

slug_registry   (slug, type [bundesland|kreis|party_art], entity_id)   -- Unique-Constraint auf slug

saved_event     (id, user_id → user, event_id → event, created_at)   -- "Partyliste", Unique(user_id, event_id)
```

Constraints/Validierung im Backend (nicht nur UI):

- Max. 3 Fotos, max. 3 Links pro Event.
- `bundesland_id`/`kreis_id` verpflichtend, aus Stammdaten gewählt (kein Freitext); `kreis_id` muss zu `bundesland_id` gehören.
- `address_description` verpflichtend, Freitext (nicht Teil des Resolvers/der Suche).
- Event erst nach `status = approved` öffentlich sichtbar/indexierbar.
- `custom_fields` ist bewusst ungetypter Escape-Hatch - häufig genutzte Ad-hoc-Felder sollen bei Bedarf in eigene Spalten migriert werden, nicht dauerhaft in `custom_fields` bleiben.

## 3. Nutzerprofile

- Jeder über SSO angelegte `user` kann ein `user_profile` anlegen/bearbeiten - wird als **Veranstalter** auf Event-Seiten angezeigt.
- Pflicht für Profil: keine (Profil ist optional, aber ohne `display_name` wird der User als Veranstalter nur mit generischem Platzhalter angezeigt - UI-Entscheidung, kein Blocker für Event-Einreichung).
- Felder: `display_name`, `avatar_s3_key` (Upload über Backend `storage`-Modul, presigned URL zu IONOS S3), `website_url`, `instagram_url`, `bio`, plus beliebig viele weitere über `user_link`.
- Profilbild-Upload läuft wie Event-Fotos über presigned Upload-URLs - kein direkter Client-Upload zu S3-Credentials.
- **Öffentliche Veranstalter-Seite** unter `/veranstalter/{slug}/` (DACH-weit, nicht länderskaliert, da ein Veranstalter Events in mehreren Ländern eintragen kann) - zeigt Profil, Links sowie kommende/vergangene Events des Nutzers. `slug` wird beim Speichern des Profils aus `display_name` abgeleitet (Kollisions-Disambiguierung analog Event-Slugs, `backend/src/slug/index.ts`) und ist erst gesetzt, sobald ein `display_name` gepflegt wurde - ohne `display_name` existiert keine öffentliche Seite. Eigene Sitemap `/sitemap-veranstalter.xml`.

## 4. Event-Customization

- Aktuell einzige Customization-Option: `custom_color` (Hex) für die Event-Detailseite, vom Einreicher beim Anlegen/Bearbeiten wählbar.
- Bewusst minimal gehalten - weitere Customization (Layout, Cover-Bild-Position etc.) ist expliziter Nicht-Scope dieser Phase.

## 5. Auth & Submission-Workflow

- **SSO via Authentik**, OpenID Connect.
- **Frontend** übernimmt den OIDC-Login-Flow (Authorization Code) und hält die Session (httpOnly-Cookie, `dp_session` = ID-Token - die angefragten Scopes profile/groups landen laut OIDC-Spec im ID-Token, nicht im Access-Token; `backend/src/auth/verify.ts` erwartet diese Claims direkt im verifizierten Token). Der `email`-Scope/-Claim wird bewusst nicht angefragt/gespeichert - viele extern angebundene Accounts (Google/Discord/Facebook via Authentik-Source) liefern ihn ohnehin nicht, und die App braucht die Adresse nirgends.
- **Backend** verifiziert eingehende Requests anhand des von Authentik ausgestellten JWT (Verifizierung über Authentik-JWKS-Endpoint, zustandslos). Rollen (`user`/`moderator`/`admin`) werden aus Authentik-Gruppen/Claims gemappt.
- Rollen: `user` (einreichen/eigenes Profil & eigene Events bearbeiten), `moderator`/`admin` (Review-Dashboard unter `/review`).
- **Registrierungs-Flow für neue Nutzer:innen:** `/auth/callback` prüft nach dem Token-Austausch `user.onboarding_completed_at`; ist es `null` (neuer oder noch nicht eingerichteter User), erfolgt Redirect zu `/willkommen?redirectTo=...` statt direkt zum ursprünglichen Ziel. `/willkommen` ist ein Multi-Step-Formular (Anzeigename → optionale Profildetails → Zusammenfassung, clientseitig gesteuert über `hidden`-Fieldsets, ein einziger Form-POST) und setzt `display_name`/`user_profile` sowie `onboarding_completed_at`. "Später einrichten" überspringt die Profildaten, markiert das Onboarding aber ebenfalls als gesehen (kein wiederholtes Nerven bei jedem Login). tRPC: `users.completeOnboarding` / `users.skipOnboarding`.
- Einreichungsformular: Titel, Beschreibung, Start-/Enddatum, Bundesland, Kreis, Adress-Beschreibung, Party-Art, max. 3 Fotos, max. 3 Links, optionale Felder (Preis, Altersbeschränkung/Muttizettel, Open Air, Tags, ...), Farbe.
- Status-Flow: `draft` → `in_review` → `approved` (öffentlich) oder `rejected`.
- Slug-Generierung + Kollisions-Disambiguierung findet beim Approve-Schritt statt, nicht bei Einreichung.

## 5.3 Organizer-Auswahl beim Event-Eintrag

Veranstaltungen können für verschiedene Veranstalter eingetragen werden (nicht nur für die einreichende Person):

**Profil-Sichtbarkeit regelt die Wahloptionen:**

- **Öffentliches Profil:** Nutzer kann sich selbst, andere öffentliche Veranstalter-Profile (Suche/Autofill) oder Freitext-Namen angeben.
- **Privates Profil:** Nutzer kann nur andere öffentliche Veranstalter-Profile (Suche) oder Freitext-Namen angeben.

**Datenmodell:**

- `event.organizer_user_id`: NULL wenn `organizer_name` gesetzt (Freitext-Veranstalter); andernfalls User-ID eines Profils.
- `event.organizer_name`: Text für Freitext-Veranstalter; NULL wenn `organizer_user_id` gesetzt.
- `event.organizer_verified`: Boolean, zeigt an, ob der aktuelle Veranstalter (User oder Name) verifiziert ist.
  - Verifizierte Veranstalter (User-Profil mit `verifiedAt`): `organizer_verified = true`
  - Nicht-verifizierte Veranstalter (User ohne Verifizierung oder Freitext-Name): `organizer_verified = false`

**Verifiziertes Veranstalter-Branding:**

- Auf der Event-Detailseite wird der Veranstalter-Name angezeigt. Wenn `organizer_verified = true`, erhält er ein Verifizierungs-Badge.
- Das Badge signalisiert dem Nutzer: "Dieser Veranstalter wurde von dorfpartys.com verifiziert, sein Eintrag ist legitim."

## 5.4 Event-Claim-Workflow (für nicht-verifizierte Events)

Wenn ein Event **nicht vom Veranstalter selbst eingereicht wurde** oder **der Veranstalter nicht verifiziert ist**, können andere **verifizierte Veranstalter** das Event "claimen" und damit die volle Kontrolle übernehmen.

**Workflow:**

1. Verifizierter Nutzer navigiert zu einem "unclaimed" Event (organizer_verified = false)
2. Auf der Event-Detailseite sieht er einen "Dieses Event verwalten"-Button
3. Klick öffnet ein Modal mit optionalem Grund-Textfeld ("Warum sollte ich dieses Event verwalten?")
4. Nutzer submittet den Claim → neuer `event_claim`-Datensatz mit `status = pending`
5. Moderationsteam (`moderator`/`admin`) prüft in einem neuen Dashboard (`/review/claims`) alle ausstehenden Claims
6. Moderator genehmigt oder lehnt ab:
   - **Genehmigt:** `event_claim.status = approved` + `event.organizer_user_id` wird auf den claimenden User gesetzt + `event.organizer_name` wird NULL + `event.organizer_verified = true` (da User verifiziert ist)
   - **Abgelehnt:** `event_claim.status = rejected` + Event bleibt unverändert

**Eindeutigkeit:** Pro Event/User-Paar nur ein ausstehender Claim gleichzeitig (Unique-Index auf `event_id` + `claimed_by_user_id`, aber nur für pending-Claims). Ein abgelehnter oder genehmigter Claim blockiert keine neuen Claims vom selben User.

**Wann wird ein Event "claimbar"?**

- Immer wenn `event.organizer_verified = false`
- Nach Genehmigung: `organizer_verified = true` (wurde claimed und approved) → nicht mehr claimbar

## 5.5 Automatische Verifizierung beim Selbst-Eintrag

Wenn ein **verifizierter Veranstalter selbst ein Event einträgt** (wählt sich selbst als `organizer_user_id`):

- Backend setzt `event.organizer_verified = true` automatisch (basierend auf `user_profile.verifiedAt` des Einreichers)
- Das Event kann nicht mehr geclaimt werden

Wenn ein **nicht-verifizierter Nutzer** selbst ein Event einträgt:

- `event.organizer_verified = false`
- Das Event kann von anderen verifizierten Veranstaltern geclaimt werden

## 5a. Gemerkte Veranstaltungen ("Partyliste")

- Eingeloggte Nutzer:innen können Events merken/entmerken (Button auf der Event-Detailseite) - Tabelle `saved_event`, tRPC-Router `savedEvents` (`save`/`unsave`/`listMine`).
- Eigene Übersicht unter `/partyliste` (geschützt, `requireUser`) - kommende/vergangene gemerkte Events, analog zur Veranstalter-Seite (Abschnitt 3) mit zusätzlichem "Entfernen"-Button pro Zeile.
- `events.getBySlug` liefert zusätzlich `isSaved` (nur wenn eingeloggt) für den Merken/Gemerkt-Toggle-Zustand.
- `noindex,nofollow` (rein personenbezogen, kein SEO-Wert).

## 5b. Land-Erkennung & -Fokus

- Beim ersten Request ohne `country`-Cookie wird das Land serverseitig aus dem `Accept-Language`-Header geraten (`de-AT`/`fr-CH`/... → `at`/`ch`, sonst `de`) und als Cookie (1 Jahr, nicht `httpOnly`) gesetzt - **bewusst ohne externen IP-Geolocation-Dienst**, um die "kein Tracking"-Positionierung der Seite nicht zu unterlaufen (Abwägung, falls doch ein Geolocation-Dienst gewünscht ist: das wäre ein externer Request pro Erstbesuch).
- Clientseitig wird die Vermutung einmalig per `Intl.DateTimeFormat().resolvedOptions().timeZone` verfeinert (`Europe/Vienna`/`Europe/Zurich` → `at`/`ch`), solange die Nutzerin das Land noch nie explizit gewechselt hat (`country_explicit`-Cookie).
- **Explizites Wechseln:** Land-Switcher in der Navbar (DE/AT/CH) verlinkt auf `/land/{country}` (als `+page.server.ts`-Load implementiert, nicht `+server.ts` - sonst behandelt SvelteKits clientseitiger Router den Klick fälschlich als 404, siehe Hinweis in Abschnitt 5c) und setzt beide Cookies dauerhaft.
- Wirkung des bevorzugten Landes: Die Startseite (`/`) fokussiert Hero-Suchformular und "Nächste Partys"-Lineup auf dieses Land; ein Link ("Alle Länder anzeigen" / "Nur {Land} anzeigen") wechselt explizit dazwischen. Die Länder-Baum-URLs (`/de/`, `/at/`, `/ch/`, Abschnitt 1.1) bleiben davon unabhängig direkt browsbar - das bevorzugte Land ist nur der **Startseiten**-Default, keine Umleitung/Sperre der anderen Länder.

## 5c. Hinweis: `+server.ts` vs. `+page.server.ts` für interne Navigationsziele

SvelteKits clientseitiger Router behandelt einen Klick auf einen `<a href>` zu einer Route, die **nur** ein `+server.ts` (kein `+page.svelte`) hat, fälschlich als 404 - der automatische Fallback auf eine volle Seitennavigation greift nur bei tatsächlich externen URLs, nicht bei internen Routen ohne Client-Page. Betroffen waren `/auth/login`, `/auth/logout` (jetzt `+page.server.ts`-Loads mit trivialem `+page.svelte`-Fallback) sowie `/land/{country}` (von Anfang an so gebaut). Bei jeder neuen Route, die nur redirectet/Cookies setzt und von einem `<a href>` aus verlinkt wird, dieses Muster verwenden, nicht `+server.ts`.

## 6. SEO-Implementierungsregeln (verbindlich)

- **Alle öffentlichen Seiten serverseitig gerendert** (SvelteKit SSR), kein Client-only-Rendering für crawlbaren Content.
- Robots-Meta: **Dynamisch basierend auf Events:** `index,follow` wenn >= 1 Event (future oder 12-month archive), `noindex,follow` wenn 0 Events total. Persönliche Seiten (`/willkommen`, `/partyliste`, `/profil`): `noindex,nofollow`.
- `schema.org/Event` JSON-LD auf jeder Event-Seite + auf Filter-Seiten für alle gelisteten Events.
- `BreadcrumbList` JSON-LD auf Filter- und Event-Seiten (max 3 Items ohne Monat).
- Filter-/Suchseiten verlinken Events als serverseitig gerenderte `<a href>`.
- 301-Redirects für alle nicht-kanonischen Segment-Reihenfolgen (siehe 1.4).
- **Month Badges in Frontend:** Semantic HTML mit `<h2 id="august">August</h2>` erzeugt Google Sitelink-Opportunities.

## 7. Domains & Storage

- Hauptdomain: `dorfpartys.com` - Land als Pfadsegment, nicht als ccTLD.
- Optional als Marketing-/Redirect-Domain: `dorf.party`.
- Kurzlink-Domain für Event-Shares: `dp.gg`, z. B. `dp.gg/schuetzenfest-eutin`.
- Objektspeicher: **IONOS S3** (S3-kompatible API) über `speicher.dorfpartys.com`, für Event-Fotos und Profilbilder. Backend spricht ausschließlich über presigned URLs mit dem Bucket - Zugangsdaten bleiben serverseitig.

### 7.1 S3-Struktur

Bucket ist **public-read** (Fotos sind ohnehin öffentlich sichtbar), aber **nicht public-write** - Uploads laufen ausschließlich über presigned PUT-URLs vom Backend.

```
events/{event_id}/{event_photo_id}.{ext}
profiles/{user_id}/{avatar_id}.{ext}
```

- Key basiert auf `event_id` (UUID), **nicht** auf dem Slug - der Slug existiert erst nach Approval (siehe 1.7), Fotos werden aber schon beim Einreichen hochgeladen.
- `event_photo_id`/`avatar_id` sind UUIDs → Pfade sind unerratbar, relevant weil auch Fotos von noch nicht freigeschalteten Events (`draft`/`in_review`) technisch unter ihrer URL abrufbar sind, sobald hochgeladen.
- Bei jedem Foto-/Avatar-Austausch wird ein **neuer Key** erzeugt (kein Overwrite) → ermöglicht `Cache-Control: public, max-age=31536000, immutable`.
- Presigned-URL-Erstellung im Backend validiert Content-Type (nur `image/jpeg`, `image/png`, `image/webp`) und Dateigröße, bevor die URL ausgestellt wird.
- Beim Löschen/Ersetzen eines Fotos entfernt das Backend aktiv den alten S3-Key (keine verwaisten öffentlichen Dateien).
- Öffentliche Lese-URL: `https://speicher.dorfpartys.com/{key}` - kein Signing nötig für GET.

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
- Keine E-Mail-Benachrichtigungen (Review-Status etc.) - Hook/Stelle im Code vorsehen, nicht implementieren.
- Keine Bezahlfunktionen/Promotion von Events.
- Keine weiteren Event-Customization-Optionen außer Farbe.

## 10. Implementierungsstand (Phase 2 SEO Refactor – abgeschlossen)

### Monat-Entfernung aus URLs

- ✅ `slugTypeEnum`: "monat" entfernt (nur Bundesland/Kreis/PartyArt)
- ✅ URL-Builder: `buildFilterUrl()` akzeptiert kein `monatSlug` mehr (max 3 Segmente)
- ✅ Resolver: Monat-Segmente werden 404
- ✅ Canonicalize: Monat nicht in kanonischer Reihenfolge
- ✅ Tests: Monat-URLs testen jetzt 404-Verhalten

### Archive-Integration

- ✅ `listApprovedEventsPast12Months()` DB-Query (12-month window, max 25 events)
- ✅ `ResolveResult`: `futureCount` + `pastCount` für UI-Granularität
- ✅ Dynamisches `indexable`: `true` nur wenn (futureCount + pastCount) > 0

### Frontend Rendering

- ✅ `[country]/[...segments]/+page.svelte`: Events nach Monat gruppiert mit `<h2 id="{monatslug}">{monatname}</h2>`
- ✅ Month-Badges für schnelle Navigation (→ Fragment-Scroll)
- ✅ "Future" + "Archive" Sektionen getrennt
- ✅ Breadcrumbs: Nur 3 Items (Land → Bundesland/Kreis → Art), kein Monat
- ✅ Self-referencing canonical tags
- ✅ Robots-Meta dynamisch gesetzt (noindex wenn indexable=false)

### Sitemaps (Phase 2 Split)

- ✅ orte.xml: Bundesland-only (immer) + Bundesland+Kreis (>=1 Event)
- ✅ arten.xml: Art-only (>=1 Event)
- ✅ Level2: BL+Art
- ✅ Level3 per Bundesland: BL+Kreis+Art (split für <50k URLs pro Sitemap)
- ✅ Sitemap Index: Dynamische Bundesland-Aggregation für Level3-Files
- ✅ URL-Reduktion: ~200k → ~15-20k URLs (93% reduction)
- ✅ Keine URL-Überschneidung zwischen Sitemaps (level1 entfernt, BL+Kreis nur in orte.xml, siehe 1.8)

### Tests & Build

- ✅ TypeScript build: erfolgreich
- ✅ Tests aktualisiert: Monat-URLs testen jetzt 404
- ✅ Keine Breaking Changes für Events/Organizer/Saved Events

### Performance

- ✅ Sitemaps deutlich kleiner (93% URL-Reduktion)
- ✅ Keine 200k+ Thin-Content-URLs mehr
- ✅ Google Indexing API Vorbereitung: Neue Canonical URLs einfacher zu pushen
