import {
  buildFilterUrl,
  buildOrganizerUrl,
  type CanonicalFilterSlugs,
  type Country,
} from "@dorfpartys/shared";
import { and, eq, isNotNull } from "drizzle-orm";
import type { Database } from "../db/index.js";
import {
  bundesland,
  event,
  kreis,
  partyArt,
  userProfile,
} from "../db/schema.js";
import {
  hasOccurredWithin12MonthsOrDateless,
  isUpcomingOrDateless,
} from "../resolver/event-date-filters.js";

export async function getEventSitemapEntries(db: Database) {
  const rows = await db
    .select({
      slug: event.slug,
      country: bundesland.country,
      updatedAt: event.updatedAt,
    })
    .from(event)
    .innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
    // future ODER dateless (Teil B: ein Event ohne Termin gilt als "kommend",
    // siehe event-date-filters.ts) - inkludiert in der Event-Sitemap, sobald
    // approved, unabhängig davon ob schon ein Datum gepflegt wurde.
    .where(and(eq(event.status, "approved"), isUpcomingOrDateless));

  return rows
    .filter(
      (row): row is { slug: string; country: Country; updatedAt: Date } =>
        row.slug !== null,
    )
    .map((row) => ({
      slug: row.slug,
      country: row.country,
      updatedAt: row.updatedAt.toISOString(),
    }));
}

/**
 * Ermittelt in EINER gruppierten Query (kein N+1 über die Kreis-/Art-Taxonomie),
 * welche Kreise, Arten bzw. Kreis+Art-/Bundesland+Art-Kombinationen
 * "indexable" sind - dieselbe Bedingung wie resolve.ts' `hasAnyEvents`
 * (future + 12-Monats-Archiv), siehe AGENTS.md 1.6. Union von "future"
 * (endDate >= now()) und "past 12 months" (endDate >= now() - 12 Monate UND
 * < now()) ist äquivalent zu `endDate >= now() - interval '12 months'` allein.
 *
 * Deckt alle Kombinationen ab, die laut resolve.ts' Formel
 * `hasAnyEvents || (!kreisId && !partyArtId)` NICHT unconditionally
 * indexierbar sind (also alles außer Country-/Bundesland-only): Kreis-only
 * (kommt kanonisch nicht vor, da Kreis immer Bundesland impliziert),
 * BL+Kreis, Art-only, BL+Art, BL+Kreis+Art.
 *
 * Optional auf ein Bundesland eingeschränkt, damit der Level3-Aufruf (der pro
 * Bundesland läuft) nicht jedes Mal das gesamte Land scannen muss.
 */
async function getIndexableFilterSets(
  db: Database,
  country: Country,
  bundeslandSlug?: string,
) {
  const rows = await db
    .select({
      bundeslandId: event.bundeslandId,
      kreisId: event.kreisId,
      partyArtId: event.partyArtId,
    })
    .from(event)
    .innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
    .where(
      and(
        eq(bundesland.country, country),
        eq(event.status, "approved"),
        // deckungsgleich mit resolve.ts hasAnyEvents (future + 12-Monats-Archiv,
        // inkl. dateless Events - siehe event-date-filters.ts)
        hasOccurredWithin12MonthsOrDateless,
        bundeslandSlug ? eq(bundesland.slug, bundeslandSlug) : undefined,
      ),
    )
    .groupBy(event.bundeslandId, event.kreisId, event.partyArtId);

  const kreisIdsWithEvents = new Set<string>();
  const kreisArtPairsWithEvents = new Set<string>();
  const artIdsWithEvents = new Set<string>();
  const bundeslandArtPairsWithEvents = new Set<string>();
  for (const row of rows) {
    kreisIdsWithEvents.add(row.kreisId);
    kreisArtPairsWithEvents.add(`${row.kreisId}:${row.partyArtId}`);
    artIdsWithEvents.add(row.partyArtId);
    bundeslandArtPairsWithEvents.add(`${row.bundeslandId}:${row.partyArtId}`);
  }
  return {
    kreisIdsWithEvents,
    kreisArtPairsWithEvents,
    artIdsWithEvents,
    bundeslandArtPairsWithEvents,
  };
}

/**
 * Alle Bundesländer + nur die Kreise mit >=1 Event (future oder 12-Monats-
 * Archiv) dieses Landes. Bundesländer sind IMMER enthalten (Land-/Bundesland-
 * Ebene ist laut resolve.ts' `indexable`-Regel immer indexierbar, AGENTS.md
 * 1.6); Kreise ohne Events werden dagegen ausgeschlossen, um die Sitemap
 * nicht mit nicht-indexierbaren (noindex) URLs zu fluten.
 */
export async function getOrteSitemapEntries(db: Database, country: Country) {
  const rows = await db
    .select({
      kreisId: kreis.id,
      bundeslandSlug: bundesland.slug,
      kreisSlug: kreis.slug,
    })
    .from(kreis)
    .innerJoin(bundesland, eq(kreis.bundeslandId, bundesland.id))
    .where(eq(bundesland.country, country));

  const bundeslaender = await db
    .select({ bundeslandSlug: bundesland.slug })
    .from(bundesland)
    .where(eq(bundesland.country, country));

  const { kreisIdsWithEvents } = await getIndexableFilterSets(db, country);

  const seen = new Set<string>();
  const entries: Array<{ loc: string }> = [];
  for (const row of bundeslaender) {
    const bundeslandUrl = buildFilterUrl(country, {
      bundeslandSlug: row.bundeslandSlug,
    });
    if (!seen.has(bundeslandUrl)) {
      seen.add(bundeslandUrl);
      entries.push({ loc: bundeslandUrl });
    }
  }
  for (const row of rows) {
    if (!kreisIdsWithEvents.has(row.kreisId)) continue;
    const kreisUrl = buildFilterUrl(country, {
      bundeslandSlug: row.bundeslandSlug,
      kreisSlug: row.kreisSlug,
    });
    if (!seen.has(kreisUrl)) {
      seen.add(kreisUrl);
      entries.push({ loc: kreisUrl });
    }
  }
  return entries;
}

/**
 * Alle aktiven Party-Arten, die mindestens 1 Event (future oder 12-Monats-
 * Archiv) im jeweiligen Land haben - Art-only ist laut resolve.ts'
 * `indexable`-Formel (`hasAnyEvents || (!kreisId && !partyArtId)`) NICHT
 * bedingungslos indexierbar (nur Country-/Bundesland-Ebene ist das), siehe
 * AGENTS.md 1.6. Arten ohne Events würden sonst als noindex,follow-URLs in
 * der Sitemap landen.
 */
export async function getArtenSitemapEntries(db: Database, country: Country) {
  const rows = await db
    .select({ id: partyArt.id, artSlug: partyArt.slug })
    .from(partyArt)
    .where(eq(partyArt.active, true));

  const { artIdsWithEvents } = await getIndexableFilterSets(db, country);

  return rows
    .filter((row) => artIdsWithEvents.has(row.id))
    .map((row) => ({
      loc: buildFilterUrl(country, { artSlug: row.artSlug }),
    }));
}

/**
 * Neue Sitemap-Struktur ohne Monate (Phase 2 Refactor):
 * - level2: Two filters (BL+Art)
 * - level3: Three filters (BL+Kreis+Art)
 *
 * Single-Filter-URLs (BL only, Art only) und BL+Kreis werden NICHT hier,
 * sondern ausschließlich über orte.xml bzw. arten.xml ausgeliefert - eine
 * eigene level1-Sitemap für BL/Art only gab es früher, war aber
 * deckungsgleich mit orte/arten und wurde entfernt; BL+Kreis war ebenso
 * deckungsgleich mit orte.xml und wurde aus level2 entfernt (doppelte URLs
 * über zwei Sitemaps verschwenden Crawl-Budget).
 *
 * Splittet pro Country + pro Bundesland um unter 50k URLs zu bleiben.
 * URLs werden nur included wenn sie indexierbar sind (mindestens 1 Event in den letzten 12 Monaten).
 */

async function getAllFilterCombinations(db: Database, country: Country) {
  const bundeslaenderResult = await db
    .select({ id: bundesland.id, slug: bundesland.slug })
    .from(bundesland)
    .where(eq(bundesland.country, country));

  const arten = await db
    .select({ id: partyArt.id, slug: partyArt.slug })
    .from(partyArt)
    .where(eq(partyArt.active, true));

  return { bundeslaenderResult, arten };
}

/**
 * Gibt alle Bundesland-Slugs eines Landes zurück (für Sitemap-Index).
 */
export async function getBundeslandSlugsForSitemapIndex(
  db: Database,
  country: Country,
) {
  const result = await db
    .select({ slug: bundesland.slug })
    .from(bundesland)
    .where(eq(bundesland.country, country))
    .orderBy(bundesland.slug);

  return result.map((row) => row.slug);
}

/**
 * Two-Filter Sitemap: BL+Art
 * (kein Art+Monat, kein BL+Monat mehr)
 *
 * BL+Kreis wird hier NICHT ausgeliefert - orte.xml deckt diese Kombination
 * bereits vollständig ab (identische Indexable-Bedingung, >=1 Event), eine
 * zweite Kopie würde nur doppelte URLs über zwei Sitemaps erzeugen.
 *
 * BL+Art wird nur aufgenommen, wenn die BL+Art-Kombination >=1 Event hat -
 * laut resolve.ts' `indexable`-Formel NICHT unconditionally indexierbar (nur
 * Country-/Bundesland-Ebene ist das), siehe AGENTS.md 1.6.
 */
export async function getFilterCombinationsLevel2SitemapEntries(
  db: Database,
  country: Country,
) {
  const { bundeslaenderResult, arten } = await getAllFilterCombinations(
    db,
    country,
  );
  const { bundeslandArtPairsWithEvents } = await getIndexableFilterSets(
    db,
    country,
  );

  const entries: Array<{ loc: string }> = [];
  const seen = new Set<string>();

  for (const bl of bundeslaenderResult) {
    for (const art of arten) {
      if (!bundeslandArtPairsWithEvents.has(`${bl.id}:${art.id}`)) continue;
      const url = buildFilterUrl(country, {
        bundeslandSlug: bl.slug,
        artSlug: art.slug,
      });
      if (!seen.has(url)) {
        seen.add(url);
        entries.push({ loc: url });
      }
    }
  }

  return entries;
}

/**
 * Three-Filter Sitemap (pro Bundesland): BL+Kreis+Art
 * Split by Bundesland to stay under 50k URLs per sitemap.
 */
export async function getFilterCombinationsLevel3SitemapEntries(
  db: Database,
  country: Country,
  bundeslandSlug: string,
) {
  const kreiseResult = await db
    .select({ id: kreis.id, slug: kreis.slug })
    .from(kreis)
    .innerJoin(bundesland, eq(kreis.bundeslandId, bundesland.id))
    .where(
      and(eq(bundesland.country, country), eq(bundesland.slug, bundeslandSlug)),
    );

  const arten = await db
    .select({ id: partyArt.id, slug: partyArt.slug })
    .from(partyArt)
    .where(eq(partyArt.active, true));

  // Auf dieses Bundesland eingeschränkt (level3 wird ohnehin pro Bundesland
  // aufgerufen), damit nicht bei jedem Bundesland-Batch das ganze Land gescannt wird.
  const { kreisArtPairsWithEvents } = await getIndexableFilterSets(
    db,
    country,
    bundeslandSlug,
  );

  const entries: Array<{ loc: string }> = [];
  const seen = new Set<string>();

  for (const kreisRow of kreiseResult) {
    for (const art of arten) {
      if (!kreisArtPairsWithEvents.has(`${kreisRow.id}:${art.id}`)) continue;
      const url = buildFilterUrl(country, {
        bundeslandSlug: bundeslandSlug,
        kreisSlug: kreisRow.slug,
        artSlug: art.slug,
      });
      if (!seen.has(url)) {
        seen.add(url);
        entries.push({ loc: url });
      }
    }
  }

  return entries;
}

/** Veranstalter mit gepflegtem Profil (öffentliche Seite, AGENTS.md 3/8). */
export async function getVeranstalterSitemapEntries(db: Database) {
  const rows = await db
    .select({ slug: userProfile.slug, updatedAt: userProfile.updatedAt })
    .from(userProfile)
    .where(and(isNotNull(userProfile.slug), eq(userProfile.isPublic, true)));

  return rows
    .filter(
      (row): row is { slug: string; updatedAt: Date } => row.slug !== null,
    )
    .map((row) => ({
      loc: buildOrganizerUrl(row.slug),
      updatedAt: row.updatedAt.toISOString(),
    }));
}
