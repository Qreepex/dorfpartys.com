# @dorfpartys/ingestion

Batch-Pipeline, die öffentliche, schlüssellose Quellen (staatliche Open-Data-Portale,
öffentliche iCal-Feeds, ...) nach Dorf-/Vereinsfesten durchsucht, filtert,
dedupliziert und als neue Zeilen an die Repo-Root-`data.csv` anhängt (Format:
`Titel;Veranstalter;Datum;Bundesland;Kreis;Partyart;Link;Linktyp`).

Kontext zu den recherchierten Quellen: `../opendata-quellen.md`.

## Ausführen

```bash
pnpm install                       # einmalig, falls noch nicht geschehen
pnpm ingest                        # vom Repo-Root, oder:
pnpm --filter ./ingestion start

pnpm --filter ./ingestion start -- --dry-run          # nur anzeigen, nichts schreiben
pnpm --filter ./ingestion start -- --source=lfv-brandenburg   # nur eine Quelle (Debugging)
pnpm --filter ./ingestion start -- --out=./andere-datei.csv   # anderer Ziel-Pfad
```

Am Ende jedes Laufs steht eine Statistik pro Quelle (abgerufen / relevant /
Gründe für Verwurf), damit sofort sichtbar ist, woran es liegt, wenn eine
Quelle nichts liefert.

## URL-Watchlist (`urls.txt`, wöchentlich)

Für Seiten, die sich nicht generisch durchsuchen lassen (einzelne
Vereins-/Feuerwehr-/Gemeinde-Webseiten), aber die man kennt und im Blick
behalten will: URL in `urls.txt` eintragen (eine pro Zeile, `#`-Kommentare
erlaubt, siehe Kopfkommentar der Datei für das optionale
`URL | BUNDESLAND | Kreis`-Format).

```bash
pnpm watch-urls                                    # vom Repo-Root
pnpm --filter ./ingestion watch-urls -- --dry-run
```

Pro URL passiert:

1. **schema.org/Event JSON-LD** wird gesucht (`<script type="application/ld+json">`,
   inkl. `@graph`-Wrapper und Arrays) - das ist strukturierte, vom Seitenbetreiber
   selbst für genau diesen Zweck (SEO/Suchmaschinen) veröffentlichte Information,
   entsprechend zuverlässig.
2. **Nur wenn kein JSON-LD gefunden wird** und eine OpenWebUI-Instanz in `.env`
   konfiguriert ist (`OPENWEBUI_BASE_URL`/`_API_KEY`/`_MODEL`, siehe
   `.env.example`): der sichtbare Seitentext geht an das dort gehostete Modell
   mit der Bitte, eine angekündigte Veranstaltung zu extrahieren
   (`util/llm.ts`). Ohne OpenWebUI-Konfiguration wird die Seite ohne JSON-LD
   einfach übersprungen (mit Log-Hinweis), nicht raten.

Beide Pfade laufen durch dieselbe `normalize`/`filter`/`dedupe`-Pipeline wie
alle anderen Connectoren - Zeilen ohne Datum/Kreis/erkennbare Partyart fallen
also genauso raus.

**Wichtig: LLM-Treffer sind weniger vertrauenswürdig als JSON-LD-Treffer.**
Die Konsolenausgabe markiert das („Event via LLM erkannt - bitte
gegenprüfen"), und `sourceId` unterscheidet intern `url-watch:jsonld` vs.
`url-watch:llm` (nicht Teil der CSV, aber sichtbar in Log-Zeilen). LLM-Zeilen
vor dem Import in die Datenbank (siehe unten) stichprobenartig prüfen -
Halluzinationsrisiko ist real, besonders bei Daten/Uhrzeiten.

**Wöchentliche Ausführung einrichten (Windows Task Scheduler):**

```powershell
schtasks /create /tn "dorfpartys-watch-urls" /sc weekly /d MON /st 09:00 `
  /tr "pnpm --dir C:\Users\bensc\localdev\dorfpartys.com --filter ./ingestion watch-urls"
```

(Pfad anpassen, falls das Repo woanders liegt. Läuft nur, wenn der Rechner zum
Zeitpunkt an ist - für unbeaufsichtigten Betrieb wäre ein Server/CI-Cronjob
robuster, aber für einen lokalen Wochen-Check reicht das.) Alternativ manuell
`pnpm watch-urls` einmal pro Woche selbst anstoßen.

## CSV → Datenbank importieren

Liegt separat im Backend (`backend/src/scripts/import-csv-events.ts`), nicht
hier - braucht direkten Zugriff auf Drizzle-Schema, Slug-Generierung und
DB-Connection des Backends, die dort schon vorhanden sind. Importiert
inhaltlich denselben Weg wie eine Einreichung über `/veranstaltung-eintragen`,
nur direkt mit `status: "approved"` (siehe README-Kommentar im Skript für
Details zur Veranstalter-Auflösung/Ghost-Accounts).

```bash
pnpm --filter backend import:csv -- --dry-run      # erst prüfen
DATABASE_URL=postgres://... pnpm --filter backend import:csv
```

Liest standardmäßig die Repo-Root-`data.csv`; per `--file=./pfad.csv`
überschreibbar. Re-Importe sind idempotent (dedupliziert über die Event-Link-URL).

## Architektur

```
src/
  env.ts                   # Lädt .env - als allererster Import in jedem CLI-Entry-Point
  types.ts                  # RawItem, NormalizedEvent, SourceConfig-Union, Connector-Interface
  sources.ts                 # Registry: welche Quellen werden bei `pnpm ingest` abgefragt
  connectors/                 # Ein Modul pro Connector-TYP (nicht pro Quelle!)
    rss.ts                     # RSS 2.0 + Atom
    ics.ts                      # iCal/ICS (inkl. wiederkehrende Termine via RRULE)
    restJson.ts                   # generische REST/JSON-API, per Dot-Path-Mapping konfiguriert
    csv.ts                         # entfernte CSV-Dateien, per Spaltennamen-Kandidaten konfiguriert
    ckan.ts                         # CKAN-Portale (package_search + Ressourcen-Download)
    urlWatch.ts                      # urls.txt: JSON-LD zuerst, sonst optional LLM-Fallback
    index.ts                          # dispatcht SourceConfig -> passender Connector
  reference/
    bundeslaender.ts            # DE Bundesland/Kreis-Referenz + Freitext-Matching
    keywords.ts                   # Partyart-Klassifikation + Relevanz-/Blocklist
  util/
    jsonld.ts                     # schema.org/Event-Extraktion aus <script type="application/ld+json">
    llm.ts                         # OpenWebUI-Chat-Completion-Client für die LLM-Fallback-Extraktion
    urlList.ts                      # urls.txt-Parser (inkl. optionalem Bundesland/Kreis-Hinweis pro Zeile)
    html.ts                          # HTML-Entity-Decoding + grobe Plaintext-Extraktion
  pipeline/
    normalize.ts                 # RawItem -> NormalizedEvent (oder verwerfen)
    filter.ts                     # Zeitfilter (nur zukünftige Events)
    dedupe.ts                      # Dedupe über Titel+Tag+Kreis und über Link
    csvWriter.ts                    # liest bestehende CSV (für Dedupe), hängt neue Zeilen an
  run.ts                       # Orchestrator: Quellen -> normalize -> filter -> dedupe -> schreiben
  index.ts                      # CLI-Einstiegspunkt für `pnpm ingest` (Registry aus sources.ts)
  watchUrls.ts                   # CLI-Einstiegspunkt für `pnpm watch-urls` (nur urls.txt-Quelle)
```

**Grundprinzip: lieber eine Zeile verwerfen als raten.** Fehlt Titel, Link,
Datum oder lässt sich der Kreis nicht eindeutig einem `Bundesländer`-Eintrag
zuordnen, fällt die Zeile komplett raus, statt mit einem falschen/leeren Wert
in die CSV zu wandern (siehe `pipeline/normalize.ts`).

## Neue Quelle hinzufügen (kein neuer Code nötig, wenn der Connector-Typ schon existiert)

Einfach einen Eintrag in `src/sources.ts` ergänzen. Beispiele für jeden Typ:

**RSS/Atom-Feed:**

```ts
{
  connector: 'rss',
  id: 'stadt-x-events',
  label: 'Stadt X Veranstaltungskalender (RSS)',
  url: 'https://stadt-x.de/veranstaltungen.rss',
  defaultBundesland: 'NW',
  defaultKreis: 'Stadt X' // falls die Quelle exakt einem Kreis entspricht
}
```

**iCal/ICS-Feed:**

```ts
{
  connector: 'ics',
  id: 'lfv-x',
  label: 'Landesfeuerwehrverband X (ICS)',
  url: 'https://lfv-x.de/feed/eo-events/',
  defaultBundesland: 'NI'
}
```

**REST/JSON-API** (z.B. ein Tourismus-Datenhub mit API-Key):

```ts
{
  connector: 'rest-json',
  id: 'niedersachsen-hub',
  label: 'Niedersachsen Hub',
  url: 'https://nds.tourismusnetzwerk.info/api/events',
  headers: { Authorization: `Bearer ${process.env.NDS_HUB_API_KEY}` },
  query: { type: 'event' },
  itemsPath: 'data.items',       // Dot-Path zum Array in der Response
  mapping: {
    title: 'title',
    link: 'detailUrl',
    date: 'startDate',
    location: 'address.city',
    organizer: 'organizer.name',
    category: 'categories[0]'
  }
}
```

API-Key nie hart codieren - in `.env` legen (siehe `.env.example`) und per
`process.env.X` einlesen; die Quelle nur aktivieren (`enabled: true` bzw. Feld
weglassen), wenn der Key vorhanden ist. Ein deaktiviertes Beispiel dafür steht
bereits in `sources.ts` (`oew-austria-example`).

**Entfernte CSV-Datei:**

```ts
{
  connector: 'csv',
  id: 'kreis-x-opendata',
  label: 'Landkreis X Open-Data-CSV',
  url: 'https://opendata.kreis-x.de/veranstaltungen.csv',
  defaultBundesland: 'BY',
  columns: {
    title: ['Titel', 'Bezeichnung'],
    link: ['Link', 'URL'],
    date: ['Datum', 'Start'],
    location: ['Ort']
  }
}
```

**CKAN-Portal** (weiteres Bundesland-/Kommunalportal):

```ts
{
  connector: 'ckan',
  id: 'opendata-xyz',
  label: 'Open Data XYZ (CKAN)',
  baseUrl: 'https://opendata.xyz.de',   // ACHTUNG: oft eine ckan.-Subdomain, nicht die Haupt-Domain
                                          // (siehe govdata-national: ckan.govdata.de statt www.govdata.de)
  searchTerms: ['Veranstaltungen', 'Feste', 'Kirmes'],
  defaultBundesland: 'SN'
}
```

## Neuen Connector-TYP hinzufügen

1. `src/types.ts`: neues `XyzSourceConfig extends SourceBase` definieren, im `SourceConfig`-Union ergänzen.
2. `src/connectors/xyz.ts`: `Connector<XyzSourceConfig>` implementieren (`fetch(source) => Promise<RawItem[]>`), siehe `rss.ts` als einfachstes Beispiel.
3. `src/connectors/index.ts`: `case 'xyz': return xyzConnector.fetch(source);` ergänzen.
4. Quellen dieses Typs wie oben in `sources.ts` eintragen.

## Bekannte Grenzen

- **Nur Deutschland** in `reference/bundeslaender.ts`. Österreich/Schweiz sind in
  `sources.ts` als Beispiel vorgesehen, aber Zeilen aus AT/CH-Quellen werden
  aktuell beim Kreis-Matching verworfen, bis eine passende Referenzdatei
  (`reference/oesterreich.ts` o.ä.) existiert.
- **CKAN-Connector arbeitet heuristisch** (Spaltennamen-Kandidaten statt festem
  Mapping), weil jedes Portal eigene Feldnamen nutzt. Ergebnisse von dort
  stichprobenartig prüfen. Gelesen werden CSV/JSON/GeoJSON/JSON-Lines/ICS-
  Ressourcen, XML/XLSX/WFS/PDF werden übersprungen. **Formatangaben sind
  zwischen CKAN-Instanzen uneinheitlich:** govdata.de (DCAT-AP.de-Harvest)
  liefert EU-Publications-Office-URIs wie
  `http://publications.europa.eu/resource/authority/file-type/CSV` statt
  `"CSV"` - `resolveResourceFormat()` in `ckan.ts` wertet deshalb nur das
  letzte URI-Segment aus. Manche als "JSON" deklarierte Ressourcen sind
  tatsächlich JSON Lines (typisch bei OpenDataSoft-`/exports/jsonl`) - wird
  über einen Parse-Fallback abgefangen (`parseJsonOrJsonLines`).
- **Viele Behörden-Datensätze sind verwaist** (govdata.de/offenesdatenportal.de
  liefern zwar thematisch passende Treffer wie "Berliner Straßen- und
  Volksfeste 2017", die verlinkten Ressourcen-URLs sind aber teils seit Jahren
  tot/404). Das fängt die Fehlerbehandlung pro Ressource ab, ohne den Lauf
  abzubrechen - ist aber der Grund, warum die generische CKAN-Volltextsuche
  bisher kaum eigene Treffer liefert. Die beiden aktuell aktiven Fest-Quellen
  (`ingolstadt-veranstaltungen`, `grevenbroich-volksfeste`) wurden nicht durch
  die generische Suche gefunden, sondern durch manuelles Nachverfolgen
  einzelner CKAN-Treffer und anschließendes Festverdrahten als eigene Quelle
  mit explizitem Mapping/`defaultKreis`. Das ist der Weg, der bisher
  tatsächlich funktioniert hat - "blind" über `searchTerms` traversieren lohnt
  sich eher zum Entdecken neuer Kandidaten als zum direkten Ernten.
- Manche Quellen liefern keinen Veranstalter-Namen (z.B. beide oben genannten
  Fest-Quellen). `pipeline/normalize.ts` füllt das **nicht** mit dem
  Bundesland-/Kreisnamen auf (früher ein Bug hier - sah plausibel aus, war
  aber falsche Information) - die Spalte bleibt dann leer statt geraten zu
  sein.
- Textfelder mancher Quellen enthalten rohe HTML-Entities (z.B. `&amp;` statt
  `&`, Ingolstadt-API) - `util/html.ts` dekodiert die gängigsten vor dem
  CSV-Export.
- Die Partyart-/Relevanz-Klassifikation (`reference/keywords.ts`) ist
  Keyword-basiert und kein Ersatz für redaktionelle Prüfung, insbesondere bei
  der Abgrenzung "kommerzielles Festival" vs. "Dorf-/Vereinsfest" - die
  Ingolstadt-Quelle vergibt Tags wie "Open Air" oder "Fasching" z.B. auch für
  normale Konzert-/Kabarett-Termine, nicht nur für Vereinsfeste.
- **URL-Watchlist/LLM-Fallback**: `util/html.ts:extractPlainText` ist Tag-Strippen
  per Regex, kein echter DOM-Parser - reicht für "LLM liest Fließtext", aber
  Tabellen/Listen-Struktur geht verloren. Der LLM-Fallback greift nur, wenn
  gar kein JSON-LD gefunden wurde, kann aber trotzdem halluzinieren (falsches
  Datum, erfundene Details) - LLM-Zeilen vor dem DB-Import prüfen (siehe
  Abschnitt oben). `delayMs` (Default 500ms) zwischen Abrufen ist bewusst
  konservativ gewählt, keine Parallelisierung - `urls.txt` ist für eine
  überschaubare, handkuratierte Liste gedacht, nicht für Massen-Crawling.
