import { and, eq, sql } from 'drizzle-orm';
import { buildFilterUrl, type Country } from '@dorfpartys/shared';
import type { Database } from '../db/index.js';
import { bundesland, event, kreis, partyArt } from '../db/schema.js';

const APPROVED_UPCOMING = (countryFilter: ReturnType<typeof eq>) =>
	and(countryFilter, eq(event.status, 'approved'), sql`${event.endDate} >= now()`);

export async function getEventSitemapEntries(db: Database) {
	const rows = await db
		.select({ slug: event.slug, country: bundesland.country, updatedAt: event.updatedAt })
		.from(event)
		.innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
		.where(and(eq(event.status, 'approved'), sql`${event.endDate} >= now()`));

	return rows
		.filter((row): row is { slug: string; country: Country; updatedAt: Date } => row.slug !== null)
		.map((row) => ({ slug: row.slug, country: row.country, updatedAt: row.updatedAt.toISOString() }));
}

/** Nur Orte (Bundesland/Kreis) mit mindestens einem aktuellen/kommenden Event (AGENTS.md 1.8). */
export async function getOrteSitemapEntries(db: Database, country: Country) {
	const rows = await db
		.selectDistinct({ bundeslandSlug: bundesland.slug, kreisSlug: kreis.slug })
		.from(event)
		.innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
		.innerJoin(kreis, eq(event.kreisId, kreis.id))
		.where(APPROVED_UPCOMING(eq(bundesland.country, country)));

	const seen = new Set<string>();
	const entries: Array<{ loc: string }> = [];
	for (const row of rows) {
		const bundeslandUrl = buildFilterUrl(country, { bundeslandSlug: row.bundeslandSlug });
		if (!seen.has(bundeslandUrl)) {
			seen.add(bundeslandUrl);
			entries.push({ loc: bundeslandUrl });
		}
		const kreisUrl = buildFilterUrl(country, {
			bundeslandSlug: row.bundeslandSlug,
			kreisSlug: row.kreisSlug
		});
		if (!seen.has(kreisUrl)) {
			seen.add(kreisUrl);
			entries.push({ loc: kreisUrl });
		}
	}
	return entries;
}

export async function getArtenSitemapEntries(db: Database, country: Country) {
	const rows = await db
		.selectDistinct({ artSlug: partyArt.slug })
		.from(event)
		.innerJoin(partyArt, eq(event.partyArtId, partyArt.id))
		.innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
		.where(APPROVED_UPCOMING(eq(bundesland.country, country)));

	return rows.map((row) => ({ loc: buildFilterUrl(country, { artSlug: row.artSlug }) }));
}
