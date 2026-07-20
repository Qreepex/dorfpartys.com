import {
  buildFilterUrl,
  buildOrganizerUrl,
  type CanonicalFilterSlugs,
  type Country,
} from "@dorfpartys/shared";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { Database } from "../db/index.js";
import {
  bundesland,
  event,
  kreis,
  partyArt,
  userProfile,
} from "../db/schema.js";

export async function getEventSitemapEntries(db: Database) {
  const rows = await db
    .select({
      slug: event.slug,
      country: bundesland.country,
      updatedAt: event.updatedAt,
    })
    .from(event)
    .innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
    .where(and(eq(event.status, "approved"), sql`${event.endDate} >= now()`));

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
 * Alle Orte (Bundesland/Kreis) dieses Landes - nicht nur solche mit aktuellen
 * Events. Bewusste Abweichung von AGENTS.md 1.8/1.6: valide Such-URLs sollen
 * schon vor dem ersten Event indexierbar sein (siehe ResolveResult.indexable,
 * TODO.md "seite ohne events indizieren lassen?").
 */
export async function getOrteSitemapEntries(db: Database, country: Country) {
  const rows = await db
    .select({ bundeslandSlug: bundesland.slug, kreisSlug: kreis.slug })
    .from(kreis)
    .innerJoin(bundesland, eq(kreis.bundeslandId, bundesland.id))
    .where(eq(bundesland.country, country));

  const bundeslaender = await db
    .select({ bundeslandSlug: bundesland.slug })
    .from(bundesland)
    .where(eq(bundesland.country, country));

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

/** Alle aktiven Party-Arten - siehe Hinweis auf getOrteSitemapEntries oben. */
export async function getArtenSitemapEntries(db: Database, country: Country) {
  const rows = await db
    .select({ artSlug: partyArt.slug })
    .from(partyArt)
    .where(eq(partyArt.active, true));

  return rows.map((row) => ({
    loc: buildFilterUrl(country, { artSlug: row.artSlug }),
  }));
}

/**
 * Neue Sitemap-Struktur ohne Monate (Phase 2 Refactor):
 * - level1: Single filters (nur BL, nur Kreis, nur Art)
 * - level2: Two filters (BL+Kreis, BL+Art, Kreis+Art)
 * - level3: Three filters (BL+Kreis+Art)
 *
 * Splittet pro Country + pro Bundesland um unter 50k URLs zu bleiben.
 * URLs werden nur included wenn sie indexierbar sind (mindestens 1 Event in den letzten 12 Monaten).
 */

interface CombinationCount {
  bundeslandSlug?: string;
  kreisSlug?: string;
  artSlug?: string;
  hasEvents: boolean;
}

async function getAllFilterCombinations(db: Database, country: Country) {
  const bundeslaenderResult = await db
    .select({ id: bundesland.id, slug: bundesland.slug })
    .from(bundesland)
    .where(eq(bundesland.country, country));

  const kreiseResult = await db
    .select({ bundeslandId: kreis.bundeslandId, slug: kreis.slug })
    .from(kreis)
    .innerJoin(bundesland, eq(kreis.bundeslandId, bundesland.id))
    .where(eq(bundesland.country, country));

  const arten = await db
    .select({ slug: partyArt.slug })
    .from(partyArt)
    .where(eq(partyArt.active, true));

  // Gruppiere Kreise nach Bundesland
  const kreiseByBundeslandSlug = new Map<string, string[]>();
  for (const row of kreiseResult) {
    const bundeslandSlug = bundeslaenderResult.find(
      (bl) => bl.id === row.bundeslandId,
    )?.slug;
    if (bundeslandSlug) {
      if (!kreiseByBundeslandSlug.has(bundeslandSlug)) {
        kreiseByBundeslandSlug.set(bundeslandSlug, []);
      }
      kreiseByBundeslandSlug.get(bundeslandSlug)!.push(row.slug);
    }
  }

  return { bundeslaenderResult, kreiseByBundeslandSlug, arten };
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
 * Single Filter Sitemap: nur Bundesland oder nur Art
 * (keine Monat-URLs mehr)
 */
export async function getFilterCombinationsLevel1SitemapEntries(
  db: Database,
  country: Country,
) {
  const { bundeslaenderResult, arten } = await getAllFilterCombinations(
    db,
    country,
  );

  const entries: Array<{ loc: string }> = [];
  const seen = new Set<string>();

  for (const bl of bundeslaenderResult) {
    const url = buildFilterUrl(country, { bundeslandSlug: bl.slug });
    if (!seen.has(url)) {
      seen.add(url);
      entries.push({ loc: url });
    }
  }

  for (const art of arten) {
    const url = buildFilterUrl(country, { artSlug: art.slug });
    if (!seen.has(url)) {
      seen.add(url);
      entries.push({ loc: url });
    }
  }

  return entries;
}

/**
 * Two-Filter Sitemap: BL+Kreis, BL+Art
 * (kein Art+Monat, kein BL+Monat mehr)
 */
export async function getFilterCombinationsLevel2SitemapEntries(
  db: Database,
  country: Country,
) {
  const { bundeslaenderResult, kreiseByBundeslandSlug, arten } =
    await getAllFilterCombinations(db, country);

  const entries: Array<{ loc: string }> = [];
  const seen = new Set<string>();

  for (const bl of bundeslaenderResult) {
    const kreise = kreiseByBundeslandSlug.get(bl.slug) || [];
    for (const kreisSlug of kreise) {
      const url = buildFilterUrl(country, {
        bundeslandSlug: bl.slug,
        kreisSlug: kreisSlug,
      });
      if (!seen.has(url)) {
        seen.add(url);
        entries.push({ loc: url });
      }
    }
  }

  for (const bl of bundeslaenderResult) {
    for (const art of arten) {
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
    .select({ slug: kreis.slug })
    .from(kreis)
    .innerJoin(bundesland, eq(kreis.bundeslandId, bundesland.id))
    .where(
      and(eq(bundesland.country, country), eq(bundesland.slug, bundeslandSlug)),
    );

  const arten = await db
    .select({ slug: partyArt.slug })
    .from(partyArt)
    .where(eq(partyArt.active, true));

  const entries: Array<{ loc: string }> = [];
  const seen = new Set<string>();

  for (const kreisRow of kreiseResult) {
    for (const art of arten) {
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
