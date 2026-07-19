export interface SlugLabel {
	slug: string;
	label: string;
}

// German federal states — drive the /events/[state] search tree and its sitemap.
export const GERMAN_STATES: SlugLabel[] = [
	{ slug: 'baden-wuerttemberg', label: 'Baden-Württemberg' },
	{ slug: 'bayern', label: 'Bayern' },
	{ slug: 'berlin', label: 'Berlin' },
	{ slug: 'brandenburg', label: 'Brandenburg' },
	{ slug: 'bremen', label: 'Bremen' },
	{ slug: 'hamburg', label: 'Hamburg' },
	{ slug: 'hessen', label: 'Hessen' },
	{ slug: 'mecklenburg-vorpommern', label: 'Mecklenburg-Vorpommern' },
	{ slug: 'niedersachsen', label: 'Niedersachsen' },
	{ slug: 'nordrhein-westfalen', label: 'Nordrhein-Westfalen' },
	{ slug: 'rheinland-pfalz', label: 'Rheinland-Pfalz' },
	{ slug: 'saarland', label: 'Saarland' },
	{ slug: 'sachsen', label: 'Sachsen' },
	{ slug: 'sachsen-anhalt', label: 'Sachsen-Anhalt' },
	{ slug: 'schleswig-holstein', label: 'Schleswig-Holstein' },
	{ slug: 'thueringen', label: 'Thüringen' }
];

export const GERMAN_STATE_SLUGS = GERMAN_STATES.map((s) => s.slug) as [string, ...string[]];

export const EVENT_CATEGORIES: SlugLabel[] = [
	{ slug: 'dorffest', label: 'Dorffest' },
	{ slug: 'strassenfest', label: 'Straßenfest' },
	{ slug: 'geburtstag', label: 'Geburtstag' },
	{ slug: 'hochzeit', label: 'Hochzeit' },
	{ slug: 'firmenfeier', label: 'Firmenfeier' },
	{ slug: 'konzert', label: 'Konzert' },
	{ slug: 'flohmarkt', label: 'Flohmarkt' },
	{ slug: 'sonstiges', label: 'Sonstiges' }
];

export const EVENT_CATEGORY_SLUGS = EVENT_CATEGORIES.map((c) => c.slug) as [string, ...string[]];

export const SITE_URL = 'https://dorfpartys.com';
export const SITE_NAME = 'Dorfpartys';
export const DEFAULT_PAGE_SIZE = 24;
