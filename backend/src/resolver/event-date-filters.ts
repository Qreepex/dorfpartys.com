import { sql } from "drizzle-orm";
import { event } from "../db/schema.js";

/**
 * Gemeinsame SQL-Fragmente für "ist dieses Event zukünftig/archiviert?" -
 * zentral hier, damit resolver (drizzle-repository.ts) und Sitemap
 * (seo/sitemap.ts) exakt dieselbe Definition verwenden (AGENTS.md 1.6:
 * indexable/futureCount/pastCount müssen deckungsgleich mit den
 * Sitemap-"indexable"-Sets sein).
 *
 * Design-Entscheidung (Teil B, "dateless events"): `start_date` ist seit
 * Phase "Quantität über Qualität" optional (AGENTS.md 5/2). Ein Event ohne
 * `start_date` gilt immer als "kommend" (nie archiviert) - ein noch nicht
 * terminiertes Event ist präsumtiv zukünftig, nicht vergangen. Ist nur
 * `end_date` leer (start_date aber gesetzt), wird `start_date` als Fallback für
 * "wann ist es vorbei" verwendet (COALESCE) - ein Event ohne bekanntes Ende
 * gilt ab seinem Start als beendet, statt für immer als "zukünftig" zu zählen.
 */
const effectiveEnd = sql`COALESCE(${event.endDate}, ${event.startDate})`;

/** Zukünftig ODER dateless (kein start_date). */
export const isUpcomingOrDateless = sql`(${event.startDate} IS NULL OR ${effectiveEnd} >= now())`;

/** Archiviert: hat ein start_date, ist aber vorbei und nicht älter als 12 Monate. */
export const isArchivedWithin12Months = sql`(${event.startDate} IS NOT NULL AND ${effectiveEnd} < now() AND ${effectiveEnd} >= now() - interval '12 months')`;

/**
 * Union aus "zukünftig/dateless" und "archiviert innerhalb 12 Monaten" - die
 * Bedingung, die AGENTS.md 1.6s `hasAnyEvents` (future + 12-Monats-Archiv)
 * entspricht. Wird für Indexierungs-/Sitemap-Zwecke gebraucht, wo nur "gibt es
 * überhaupt (noch relevante) Events" zählt, nicht die Aufteilung selbst.
 */
export const hasOccurredWithin12MonthsOrDateless = sql`(${event.startDate} IS NULL OR ${effectiveEnd} >= now() - interval '12 months')`;
