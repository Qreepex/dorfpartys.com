import { and, eq, isNotNull, sql } from "drizzle-orm";
import { buildFilterUrl, buildOrganizerUrl, type Country } from "@dorfpartys/shared";
import type { Database } from "../db/index.js";
import { bundesland, event, kreis, partyArt, userProfile } from "../db/schema.js";

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
 * Alle Orte (Bundesland/Kreis) dieses Landes — nicht nur solche mit aktuellen
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

/** Alle aktiven Party-Arten — siehe Hinweis auf getOrteSitemapEntries oben. */
export async function getArtenSitemapEntries(db: Database, country: Country) {
  const rows = await db
    .select({ artSlug: partyArt.slug })
    .from(partyArt)
    .where(eq(partyArt.active, true));

  return rows.map((row) => ({
    loc: buildFilterUrl(country, { artSlug: row.artSlug }),
  }));
}

/** Veranstalter mit gepflegtem Profil (öffentliche Seite, AGENTS.md 3/8). */
export async function getVeranstalterSitemapEntries(db: Database) {
  const rows = await db
    .select({ slug: userProfile.slug, updatedAt: userProfile.updatedAt })
    .from(userProfile)
    .where(isNotNull(userProfile.slug));

  return rows
    .filter((row): row is { slug: string; updatedAt: Date } => row.slug !== null)
    .map((row) => ({
      loc: buildOrganizerUrl(row.slug),
      updatedAt: row.updatedAt.toISOString(),
    }));
}
