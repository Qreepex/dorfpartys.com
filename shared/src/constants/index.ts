import { getGermanDateParts } from '../date/german-time.js';

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

/**
 * Baut Slug (Fragment-Id) + Label für eine Monats-Überschrift auf Filter-/Suchseiten.
 *
 * Events im aktuellen Kalenderjahr behalten das evergreen Format ("August" / "#august").
 * Events in einem abweichenden Jahr (z.B. Archiv-Events aus dem Vorjahr, oder weit im
 * Voraus liegende kommende Events) bekommen zur Disambiguierung das Jahr angehängt
 * ("August 2027" / "#august-2027") - siehe AGENTS.md Abschnitt 1.2/6 zu Month-Badges.
 *
 * Das Jahr wird IMMER angehängt sobald es vom aktuellen Jahr abweicht (nicht nur bei
 * tatsächlicher Kollision mit einem anderen Monat), damit das Verhalten vorhersehbar
 * bleibt statt von den übrigen Events auf der Seite abzuhängen.
 */
export function monthGroup(date: Date, now: Date = new Date()): { slug: string; label: string } {
	const parts = getGermanDateParts(date);
	const month = MONTHS[parts.month - 1];
	const year = parts.year;
	if (year === getGermanDateParts(now).year) {
		return { slug: month.slug, label: month.name };
	}
	return { slug: `${month.slug}-${year}`, label: `${month.name} ${year}` };
}

// Canonical filter-segment order per AGENTS.md 1.2/1.4: bundesland -> kreis -> art.
export const CANONICAL_SEGMENT_ORDER = ['bundesland', 'kreis', 'art'] as const;
export type SegmentType = (typeof CANONICAL_SEGMENT_ORDER)[number];

// Startliste Party-Arten (AGENTS.md Abschnitt 10 - vollständige Liste ist offener Punkt).
export const PARTY_ART_SEED: Array<{ slug: string; name: string }> = [
	{ slug: 'schuetzenfeste', name: 'Schützenfeste' },
	{ slug: 'zeltfeten', name: 'Zeltfeten' },
	{ slug: 'scheunenfeten', name: 'Scheunenfeten' },
	{ slug: 'stoppelfeten', name: 'Stoppelfeten' },
	{ slug: 'dorffeste', name: 'Dorffeste' },
	{ slug: 'osterfeuer', name: 'Osterfeuer' },
	{ slug: 'oktoberfeste', name: 'Oktoberfeste' },
	{ slug: 'karneval-fasching', name: 'Karneval / Fasching' },
	{ slug: 'sportfeste', name: 'Sportfeste' },
	{ slug: 'feuerwehrfeste', name: 'Feuerwehrfeste' },
	{ slug: 'erntefeste', name: 'Erntefeste' },
	{ slug: 'maifeste', name: 'Maifeste' },
	{ slug: 'trecker-treck-tractorplling', name: 'Trecker-Treck / Tractorpulling' },
	{ slug: 'open-air', name: 'Open Air' },
	{ slug: 'sonstiges', name: 'Sonstiges' },
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

// Notification-Typen für die Navbar-Glocke (siehe backend/src/notifications/index.ts) -
// je eine Variante für Annahme/Ablehnung der vier Szenarien aus AGENTS.md 5.4/5.5.
export const NOTIFICATION_TYPES = [
	'verification_approved',
	'verification_rejected',
	'event_approved',
	'event_rejected',
	'account_claim_approved',
	'account_claim_rejected',
	'event_claim_approved',
	'event_claim_rejected'
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const MAX_EVENT_PHOTOS = 1;
export const MAX_EVENT_LINKS = 3;

export const MAX_IMAGE_SIZE_MB = 1;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

// Profilbild (AGENTS.md Abschnitt 3): "bis zu 128x128" - Obergrenze, kein
// Pflichtmaß. Client skaliert/croppt darauf runter, Backend erzwingt das
// serverseitig nochmal (nie dem Client vertrauen, siehe
// backend/src/storage/image-validation.ts).
export const MAX_AVATAR_DIMENSION = 128;



export function buildInCountryTag(country: Country): string {
	if (country === "ch") {
		return `in der ${COUNTRY_NAMES[country]}`;
	}

	return `in ${COUNTRY_NAMES[country]}`;
}

export const COUNTRY_NAMES: Record<Country, string> = {
	de: "Deutschland",
	at: "Österreich",
	ch: "Schweiz",
};

// Für Überschriften/Meta-Title braucht es die Nominativ-Form ohne "der".
export const COUNTRY_NAMES_NOMINATIVE: Record<Country, string> = {
	de: "Deutschland",
	at: "Österreich",
	ch: "Schweiz",
};