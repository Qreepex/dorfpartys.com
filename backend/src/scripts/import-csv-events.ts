import {
  defaultEventLinkLabel,
  fromGermanIsoDateString,
} from "@dorfpartys/shared";
import { parse } from "csv-parse/sync";
import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { db, queryClient } from "../db/index.js";
import {
  bundesland,
  event,
  eventLink,
  kreis,
  partyArt,
  user,
  userProfile,
} from "../db/schema.js";
import { sanitizeText } from "../sanitization/index.js";
import {
  generateUniqueEventSlug,
  generateUniqueOrganizerSlug,
} from "../slug/index.js";

/**
 * Importiert Events aus der CSV-Pipeline (siehe `ingestion/`, Format
 * `Titel;Veranstalter;Datum;Bundesland;Kreis;Partyart;Link;Linktyp`) direkt in
 * die Datenbank - inhaltlich derselbe Weg wie eine Einreichung über
 * /veranstaltung-eintragen (siehe `eventsRouter.create` + `.review` in
 * `routers/events.ts`), nur ohne HTTP/Auth-Kontext und mit sofortigem
 * `status: "approved"`, weil diese Events als bereits recherchiert/verifiziert
 * gelten (nicht als Nutzer-Einreichung, die erst noch durch die
 * Review-Warteschlange muss).
 *
 * Nutzung:
 *   DATABASE_URL=postgres://... pnpm --filter backend import:csv
 *   pnpm --filter backend import:csv -- --file=./andere-datei.csv --dry-run
 *
 * `.env` in backend/ wird automatisch geladen (siehe `db:seed:demo`-Vorbild);
 * eine explizit gesetzte DATABASE_URL-Env-Var hat Vorrang.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));

const BUNDESLAND_CODE_TO_SLUG: Record<string, string> = {
  SH: "schleswig-holstein",
  HH: "hamburg",
  NI: "niedersachsen",
  HB: "bremen",
  NW: "nordrhein-westfalen",
  HE: "hessen",
  RP: "rheinland-pfalz",
  BW: "baden-wuerttemberg",
  BY: "bayern",
  SL: "saarland",
  BE: "berlin",
  BB: "brandenburg",
  MV: "mecklenburg-vorpommern",
  SN: "sachsen",
  ST: "sachsen-anhalt",
  TH: "thueringen",
  "SCHLESWIG-HOLSTEIN": "schleswig-holstein",
  NIEDERSACHSEN: "niedersachsen",
  HAMBURG: "hamburg",
  BREMEN: "bremen",
  "NORDRHEIN-WESTFALEN": "nordrhein-westfalen",
  HESSEN: "hessen",
  "RHEINLAND-PFALZ": "rheinland-pfalz",
  "BADEN-WÜRTTEMBERG": "baden-wuerttemberg",
  BAYERN: "bayern",
  SAARLAND: "saarland",
  BERLIN: "berlin",
  BRANDENBURG: "brandenburg",
  "MECKLENBURG-VORPOMMERN": "mecklenburg-vorpommern",
  SACHSEN: "sachsen",
  "SACHSEN-ANHALT": "sachsen-anhalt",
  THÜRINGEN: "thueringen",
  // AT/CH haben (anders als DE) keinen etablierten 2-Buchstaben-Code - offizielle
  // AT-Bundesland-/CH-Kantonskürzel würden direkt mit deutschen Codes kollidieren
  // (z.B. AT-Steiermark vs. DE-Sachsen-Anhalt beide "ST", CH-Bern vs. DE-Berlin
  // beide "BE"). Die Ingestion-Pipeline (siehe `ingestion/src/reference/bundeslaender.ts`)
  // schreibt für AT/CH deshalb den vollen Bundesland-/Kantonsnamen in die
  // Bundesland-Spalte statt eines Codes - hier 1:1 auf den jeweiligen
  // `bundesland.slug` aus `backend/src/db/seed/data.ts` gemappt.
  WIEN: "wien",
  NIEDERÖSTERREICH: "niederoesterreich",
  OBERÖSTERREICH: "oberoesterreich",
  STEIERMARK: "steiermark",
  TIROL: "tirol",
  KÄRNTEN: "kaernten",
  SALZBURG: "salzburg",
  VORARLBERG: "vorarlberg",
  BURGENLAND: "burgenland",
  ZÜRICH: "zuerich",
  BERN: "bern",
  LUZERN: "luzern",
  URI: "uri",
  SCHWYZ: "schwyz",
  OBWALDEN: "obwalden",
  NIDWALDEN: "nidwalden",
  GLARUS: "glarus",
  ZUG: "zug",
  FREIBURG: "freiburg",
  SOLOTHURN: "solothurn",
  "BASEL-STADT": "basel-stadt",
  "BASEL-LANDSCHAFT": "basel-landschaft",
  SCHAFFHAUSEN: "schaffhausen",
  "APPENZELL AUSSERRHODEN": "appenzell-ausserrhoden",
  "APPENZELL INNERRHODEN": "appenzell-innerrhoden",
  "ST. GALLEN": "st-gallen",
  GRAUBÜNDEN: "graubuenden",
  AARGAU: "aargau",
  THURGAU: "thurgau",
  TESSIN: "tessin",
  WAADT: "waadt",
  WALLIS: "wallis",
  NEUENBURG: "neuenburg",
  GENF: "genf",
  JURA: "jura",
};

interface CsvRow {
  Titel: string;
  Veranstalter: string;
  Datum: string;
  Bundesland: string;
  Kreis: string;
  Partyart: string;
  Link: string;
  Linktyp: string;
}

interface ImportStats {
  total: number;
  imported: number;
  alreadyImported: number;
  skippedInvalidRow: number;
  skippedUnknownTaxonomy: number;
  errors: number;
}

function parseArgs(argv: string[]) {
  const args = { file: undefined as string | undefined, dryRun: false };
  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg.startsWith("--file=")) args.file = arg.slice("--file=".length);
  }
  return args;
}

function readCsvRows(csvPath: string): CsvRow[] {
  const content = readFileSync(csvPath, "utf-8");
  return parse(content, {
    columns: true,
    delimiter: ";",
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as CsvRow[];
}

/** Technischer Account für created_by/approved_by - kein Veranstalter, taucht nirgends als Organizer auf. */
async function ensureImportBotUser(): Promise<string> {
  const authentikSubject = "system:csv-import-bot";
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.authentikSubject, authentikSubject));
  if (existing) return existing.id;

  const [created] = await db
    .insert(user)
    .values({
      authentikSubject,
      role: "admin",
      isGhost: true,
      onboardingCompletedAt: new Date(),
    })
    .returning({ id: user.id });
  return created.id;
}

/**
 * Findet ein bestehendes Ghost-Profil mit exakt diesem Anzeigenamen oder legt
 * eines an - identische Logik zum Freitext-Veranstalter-Zweig von
 * `resolveOrganizerAssignment` in `routers/events.ts`, nur wiederverwendend
 * statt bei jeder Zeile neu anzulegen (sonst bekäme z.B. "Freiwillige
 * Feuerwehr Wardow" bei jedem Import ein neues Ghost-Profil).
 */
async function findOrCreateGhostOrganizer(
  displayName: string,
): Promise<string> {
  const [existingGhost] = await db
    .select({ userId: userProfile.userId })
    .from(userProfile)
    .innerJoin(user, eq(user.id, userProfile.userId))
    .where(
      and(eq(user.isGhost, true), eq(userProfile.displayName, displayName)),
    );
  if (existingGhost) return existingGhost.userId;

  const [ghost] = await db
    .insert(user)
    .values({
      authentikSubject: null,
      role: "user",
      isGhost: true,
      onboardingCompletedAt: new Date(),
    })
    .returning({ id: user.id });

  const slug = await generateUniqueOrganizerSlug(db, displayName, ghost.id);
  await db.insert(userProfile).values({
    userId: ghost.id,
    slug,
    isPublic: true,
    displayName,
  });
  return ghost.id;
}

async function importRow(
  row: CsvRow,
  rowIndex: number,
  importBotUserId: string,
  dryRun: boolean,
  stats: ImportStats,
): Promise<void> {
  const title = sanitizeText(row.Titel?.trim() ?? "");
  const link = row.Link?.trim();
  let dateRaw = row.Datum?.trim();
  const bundeslandCode = row.Bundesland?.trim().toUpperCase();
  let kreisName = row.Kreis?.trim();
  const partyArtSlug = row.Partyart?.trim();
  const organizerName = sanitizeText(row.Veranstalter?.trim() ?? "") || null;

  if (!title || !dateRaw || !bundeslandCode || !kreisName || !partyArtSlug) {
    console.warn(
      `  Zeile ${rowIndex}: übersprungen - Pflichtfeld fehlt ("${title || row.Titel}")`,
    );
    stats.skippedInvalidRow += 1;
    return;
  }

  // wenn datum in DD.MM.YYYY oder D.M.YYYY, dann in YYYY-MM-DD konvertieren, sonst parse() wird NaN
  if (dateRaw.includes(".")) {
    const [day, month, year] = dateRaw.split(".");
    dateRaw = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Die CSV-Pipeline liefert Datum ausschließlich als reines "YYYY-MM-DD"
  // (keine Uhrzeit bekannt) - `new Date(dateRaw)` würde das als UTC-Mitternacht
  // parsen, was in Europe/Berlin bereits 01:00/02:00 ist und `hasKnownGermanTime`
  // im Frontend fälschlich "Uhrzeit bekannt" anzeigen ließe. Stattdessen über
  // `fromGermanIsoDateString` explizit Mitternacht in Europe/Berlin bauen, damit
  // diese Events dort korrekt als reines Datum (ohne Uhrzeit) erscheinen.
  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw);
  const startDate = dateOnlyMatch
    ? fromGermanIsoDateString(dateRaw)
    : new Date(dateRaw);
  if (Number.isNaN(startDate.getTime())) {
    console.warn(
      `  Zeile ${rowIndex}: übersprungen - Datum "${dateRaw}" nicht parsbar ("${title}")`,
    );
    stats.skippedInvalidRow += 1;
    return;
  }

  const bundeslandSlug = BUNDESLAND_CODE_TO_SLUG[bundeslandCode];
  if (!bundeslandSlug) {
    console.warn(
      `  Zeile ${rowIndex}: übersprungen - unbekannter Bundesland-Code "${bundeslandCode}" ("${title}")`,
    );
    stats.skippedUnknownTaxonomy += 1;
    return;
  }

  const [bundeslandRow] = await db
    .select({ id: bundesland.id, country: bundesland.country })
    .from(bundesland)
    .where(eq(bundesland.slug, bundeslandSlug));
  if (!bundeslandRow) {
    console.warn(
      `  Zeile ${rowIndex}: übersprungen - Bundesland "${bundeslandSlug}" nicht in DB ("${title}")`,
    );
    stats.skippedUnknownTaxonomy += 1;
    return;
  }

  if (kreisName === "Kreis Herzogtum Lauenburg") {
    kreisName = "Herzogtum Lauenburg";
  } else if (kreisName === "Landkreis Harburg") {
    kreisName = "Harburg (Landkreis)";
  } else if (kreisName === "Landkreis Lüneburg") {
    kreisName = "Lüneburg";
  } else if (kreisName === "Kreis Ostholstein") {
    kreisName = "Ostholstein";
  } else if (kreisName === "Landkreis Storman") {
    kreisName = "Stormarn";
  } else if (kreisName === "Kreis Storman") {
    kreisName = "Stormarn";
  }

  if (kreisName.startsWith("Landkreis ")) {
    kreisName = kreisName.slice("Landkreis ".length);
  }

  if (kreisName.startsWith("Kreis ")) {
    kreisName = kreisName.slice("Kreis ".length);
  }

  const [kreisRow] = await db
    .select({ id: kreis.id, name: kreis.name })
    .from(kreis)
    .where(
      and(eq(kreis.name, kreisName), eq(kreis.bundeslandId, bundeslandRow.id)),
    );
  if (!kreisRow) {
    console.warn(
      `  Zeile ${rowIndex}: übersprungen - Kreis "${kreisName}" (${bundeslandCode}) nicht in DB ("${title}")`,
    );
    stats.skippedUnknownTaxonomy += 1;
    return;
  }

  const [partyArtRow] = await db
    .select({ id: partyArt.id })
    .from(partyArt)
    .where(eq(partyArt.slug, partyArtSlug));
  if (!partyArtRow) {
    console.warn(
      `  Zeile ${rowIndex}: übersprungen - Partyart "${partyArtSlug}" nicht in DB ("${title}")`,
    );
    stats.skippedUnknownTaxonomy += 1;
    return;
  }

  // Idempotenz: CSV wächst wöchentlich weiter (siehe ingestion/), Re-Importe
  // dürfen bereits importierte Zeilen nicht duplizieren. Der Link ist der
  // stabilste natürliche Schlüssel - die Ingestion-Pipeline dedupliziert
  // selbst schon darüber (siehe ingestion/src/pipeline/dedupe.ts).
  if (link) {
    const [existingLink] = await db
      .select({ eventId: eventLink.eventId })
      .from(eventLink)
      .where(eq(eventLink.url, link));
    if (existingLink) {
      stats.alreadyImported += 1;
      return;
    }
  }

  // Fallback für Zeilen ohne Link (viele Quellen liefern keinen, siehe
  // README "Bekannte Grenzen") - ohne diesen zweiten Schlüssel würde ein
  // Re-Import bei jedem Lauf ein Duplikat für jede linklose Zeile anlegen,
  // weil der Link-Check oben dafür gar nicht greift. Titel+Kreis+Datum ist
  // in der Praxis eindeutig genug für dieselbe CSV-Zeile.
  const [existingByNaturalKey] = await db
    .select({ id: event.id })
    .from(event)
    .where(
      and(
        eq(event.title, title),
        eq(event.kreisId, kreisRow.id),
        eq(event.startDate, startDate),
      ),
    );
  if (existingByNaturalKey) {
    stats.alreadyImported += 1;
    return;
  }

  if (dryRun) {
    console.log(
      `  [DRY-RUN] würde importieren: "${title}" (${kreisRow.name}, ${partyArtSlug}) - Veranstalter: ${organizerName ?? "(unbekannt)"}`,
    );
    stats.imported += 1;
    return;
  }

  // Bewusst ohne explizite DB-Transaktion, analog zu `eventsRouter.create` in
  // routers/events.ts - dort laufen Organizer-Resolution und Event-Insert
  // ebenfalls als einfache sequenzielle awaits.
  try {
    const organizerUserId = organizerName
      ? await findOrCreateGhostOrganizer(organizerName)
      : null;
    const slug = await generateUniqueEventSlug(db, title, kreisRow.name);

    const [eventRow] = await db
      .insert(event)
      .values({
        slug,
        title,
        organizerUserId,
        organizerName: null,
        organizerVerified: false,
        organizerConfirmed: true,
        startDate,
        bundeslandId: bundeslandRow.id,
        kreisId: kreisRow.id,
        partyArtId: partyArtRow.id,
        status: "approved",
        createdBy: importBotUserId,
        approvedBy: importBotUserId,
        approvedAt: new Date(),
      })
      .returning({ id: event.id });

    if (link) {
      await db.insert(eventLink).values({
        eventId: eventRow.id,
        url: link,
        label: defaultEventLinkLabel(link),
        position: 1,
      });
    }

    console.log(
      `  Importiert: ${title} (/${bundeslandRow.country}/veranstaltung/${slug})`,
    );
    stats.imported += 1;
  } catch (error) {
    console.error(
      `  Zeile ${rowIndex}: Fehler beim Import von "${title}":`,
      error,
    );
    stats.errors += 1;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const csvPath = args.file
    ? resolve(process.cwd(), args.file)
    : resolve(__dirname, "../../../data.csv");

  console.log(
    `CSV-Import startet${args.dryRun ? " (Trockenlauf, es wird nichts geschrieben)" : ""}...`,
  );
  console.log(`Quelle: ${csvPath}\n`);

  const rows = readCsvRows(csvPath);
  const importBotUserId = args.dryRun ? "" : await ensureImportBotUser();

  const stats: ImportStats = {
    total: rows.length,
    imported: 0,
    alreadyImported: 0,
    skippedInvalidRow: 0,
    skippedUnknownTaxonomy: 0,
    errors: 0,
  };

  for (let i = 0; i < rows.length; i += 1) {
    await importRow(rows[i], i + 2, importBotUserId, args.dryRun, stats);
  }

  console.log("\nZusammenfassung:");
  console.log(`  ${stats.total} Zeilen in der CSV`);
  console.log(
    `  ${stats.imported} ${args.dryRun ? "würden importiert" : "importiert"}`,
  );
  console.log(
    `  ${stats.alreadyImported} bereits vorher importiert (übersprungen)`,
  );
  console.log(
    `  ${stats.skippedInvalidRow} übersprungen (Pflichtfeld/Datum fehlt oder ungültig)`,
  );
  console.log(
    `  ${stats.skippedUnknownTaxonomy} übersprungen (Bundesland/Kreis/Partyart nicht in DB)`,
  );
  console.log(`  ${stats.errors} Fehler beim Schreiben`);
}

main()
  .catch((error) => {
    console.error("CSV-Import abgebrochen:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
