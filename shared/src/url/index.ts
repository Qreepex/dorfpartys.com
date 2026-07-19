import type { Country } from '../constants/index.js';

export interface CanonicalFilterSlugs {
	bundeslandSlug?: string | null;
	kreisSlug?: string | null;
	artSlug?: string | null;
	monatSlug?: string | null;
}

/**
 * Baut die kanonische Filter-URL aus vorhandenen Segmenten in fester Reihenfolge
 * bundesland -> kreis -> art -> monat (AGENTS.md 1.2/1.4). Reine Funktion, kein DB-Zugriff —
 * ruft NICHT das Backend auf, um z.B. den Bundesland-Slug zu einem Kreis nachzuschlagen.
 * Der Aufrufer muss kreisSlug nur zusammen mit dem passenden bundeslandSlug übergeben.
 */
export function buildFilterUrl(country: Country, filters: CanonicalFilterSlugs = {}): string {
	const segments = [
		filters.bundeslandSlug,
		filters.kreisSlug,
		filters.artSlug,
		filters.monatSlug
	].filter((segment): segment is string => Boolean(segment));

	return `/${[country, ...segments].join('/')}/`;
}

export function buildEventUrl(country: Country, slug: string): string {
	return `/${country}/party/${slug}/`;
}

export function buildCountryRootUrl(country: Country): string {
	return `/${country}/`;
}
