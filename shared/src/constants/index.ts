export const COUNTRIES = ['de', 'at', 'ch'] as const;
export type Country = (typeof COUNTRIES)[number];

export interface MonthDefinition {
	slug: string;
	number: number; // 1–12
	name: string;
}

// Evergreen month vocabulary - no year in the URL (see AGENTS.md 1.4).
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

// Startliste Party-Arten (AGENTS.md Abschnitt 10 - vollständige Liste ist offener Punkt).
export const PARTY_ART_SEED: Array<{ slug: string; name: string }> = [
	{ slug: 'schuetzenfeste', name: 'Schützenfeste' },
	{ slug: 'zeltfeten', name: 'Zeltfeten' },
	{ slug: 'scheunenfeten', name: 'Scheunenfeten' },
	{ slug: 'stoppelfeten', name: 'Stoppelfeten' },
	{ slug: 'dorffeste', name: 'Dorffeste' },
	{ slug: 'maifeste', name: 'Maifeste' },
	{ slug: 'weinfeste', name: 'Weinfeste' },
	{ slug: 'kirmes', name: 'Kirmes' },
	{ slug: 'straßenfeste', name: 'Straßenfeste' },
	{ slug: 'osterfeuer', name: 'Osterfeuer' },
	{ slug: 'oktoberfeste', name: 'Oktoberfeste' },
	{ slug: 'karneval', name: 'Karneval' },
	{ slug: 'fasching', name: 'Fasching' },
	{ slug: 'weihnachtsmarkt', name: 'Weihnachtsmärkte' },
	{ slug: 'sportfeste', name: 'Sportfeste' },
	{ slug: 'feuerwehrfeste', name: 'Feuerwehrfeste' }
];

export const SITE_URL = 'https://www.dorfpartys.com';
export const SITE_NAME = 'dorfpartys.com';
export const DEFAULT_PAGE_SIZE = 24;

export const USER_ROLES = ['user', 'moderator', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const VERIFICATION_METHODS = ['email', 'instagram', 'tiktok'] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const EVENT_STATUSES = ['draft', 'in_review', 'approved', 'rejected'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const MAX_EVENT_PHOTOS = 1;
export const MAX_EVENT_LINKS = 3;

export const MAX_IMAGE_SIZE_MB = 1;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
