export const COUNTRIES = ['de', 'at', 'ch'] as const;
export type Country = (typeof COUNTRIES)[number];

export interface MonthDefinition {
	slug: string;
	number: number; // 1–12
	name: string;
}

// Evergreen month vocabulary — no year in the URL (see AGENTS.md 1.4).
export const MONTHS: MonthDefinition[] = [
	{ slug: 'januar', number: 1, name: 'Januar' },
	{ slug: 'februar', number: 2, name: 'Februar' },
	{ slug: 'maerz', number: 3, name: 'März' },
	{ slug: 'april', number: 4, name: 'April' },
	{ slug: 'mai', number: 5, name: 'Mai' },
	{ slug: 'juni', number: 6, name: 'Juni' },
	{ slug: 'juli', number: 7, name: 'Juli' },
	{ slug: 'august', number: 8, name: 'August' },
	{ slug: 'september', number: 9, name: 'September' },
	{ slug: 'oktober', number: 10, name: 'Oktober' },
	{ slug: 'november', number: 11, name: 'November' },
	{ slug: 'dezember', number: 12, name: 'Dezember' }
];

export const MONTH_SLUGS = MONTHS.map((m) => m.slug) as [string, ...string[]];

// Canonical filter-segment order per AGENTS.md 1.2/1.4: bundesland -> kreis -> art -> monat.
export const CANONICAL_SEGMENT_ORDER = ['bundesland', 'kreis', 'art', 'monat'] as const;
export type SegmentType = (typeof CANONICAL_SEGMENT_ORDER)[number];

// Startliste Party-Arten (AGENTS.md Abschnitt 10 — vollständige Liste ist offener Punkt).
export const PARTY_ART_SEED: Array<{ slug: string; name: string }> = [
	{ slug: 'schuetzenfeste', name: 'Schützenfest' },
	{ slug: 'zeltfeten', name: 'Zeltfete' },
	{ slug: 'scheunenfeten', name: 'Scheunenfete' },
	{ slug: 'stoppelfeten', name: 'Stoppelfete' },
	{ slug: 'dorffeste', name: 'Dorffest' },
	{ slug: 'maifeste', name: 'Maifest' },
	{ slug: 'weinfeste', name: 'Weinfest' },
	{ slug: 'kirmes', name: 'Kirmes' },
	{ slug: 'straßenfeste', name: 'Straßenfest' },
	{ slug: 'osterfeuer', name: 'Osterfeuer' },
	{ slug: 'oktoberfeste', name: 'Oktoberfest' },
	{ slug: 'karneval', name: 'Karneval' },
	{ slug: 'fasching', name: 'Fasching' },
	{ slug: 'weihnachtsmarkt', name: 'Weihnachtsmarkt' },
	{ slug: 'sportfeste', name: 'Sportfest' },
	{ slug: 'feuerwehrfeste', name: 'Feuerwehrfest' }
];

export const SITE_URL = 'https://dorfpartys.com';
export const SITE_NAME = 'dorfpartys.com';
export const DEFAULT_PAGE_SIZE = 24;

export const USER_ROLES = ['user', 'moderator', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const EVENT_STATUSES = ['draft', 'in_review', 'approved', 'rejected'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const MAX_EVENT_PHOTOS = 3;
export const MAX_EVENT_LINKS = 3;
