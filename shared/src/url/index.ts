import type { Country } from '../constants/index.js';

export interface CanonicalFilterSlugs {
	bundeslandSlug?: string | null;
	kreisSlug?: string | null;
	artSlug?: string | null;
}

/**
 * Baut die kanonische Filter-URL aus vorhandenen Segmenten in fester Reihenfolge
 * bundesland -> kreis -> art (AGENTS.md 1.2/1.4). Reine Funktion, kein DB-Zugriff -
 * ruft NICHT das Backend auf, um z.B. den Bundesland-Slug zu einem Kreis nachzuschlagen.
 * Der Aufrufer muss kreisSlug nur zusammen mit dem passenden bundeslandSlug übergeben.
 *
 * Monate werden nicht in URLs kodiert, sondern über Fragment-IDs (#august) und
 * Query-Parameter gelöst (siehe AGENTS.md 1.2 überarbeitete Struktur).
 */
export function buildFilterUrl(country: Country, filters: CanonicalFilterSlugs = {}): string {
	const segments = [
		filters.bundeslandSlug,
		filters.kreisSlug,
		filters.artSlug
	].filter((segment): segment is string => Boolean(segment));

	return `/${[country, ...segments].join('/')}/`;
}

export function buildEventUrl(country: Country, slug: string): string {
	return `/${country}/veranstaltung/${slug}/`;
}

export function buildCountryRootUrl(country: Country): string {
	return `/${country}/`;
}

/** Veranstalter-Profile sind DACH-weit (nicht länderskaliert), siehe AGENTS.md Abschnitt 3/8. */
export function buildOrganizerUrl(slug: string): string {
	return `/veranstalter/${slug}/`;
}
