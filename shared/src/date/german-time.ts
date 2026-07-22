/**
 * Alle Events finden in Deutschland, Österreich oder der Schweiz statt - die
 * drei Länder teilen sich dieselbe Zeitzone (CET/CEST, Europe/Berlin ==
 * Europe/Vienna == Europe/Zurich). Datum/Uhrzeit eines Events werden daher
 * IMMER in dieser Zeitzone dargestellt, unabhängig davon, in welcher
 * Zeitzone der ausführende Prozess läuft (Server-Container meist UTC) oder
 * in welcher Zeitzone sich ein Website-Besucher befindet - alles andere
 * führt zu falsch angezeigten Uhrzeiten (z.B. `date.getHours()`/
 * `toLocaleString()` ohne `timeZone`-Option nutzen sonst die Zeitzone des
 * AUSFÜHRENDEN Prozesses, nicht die des Events).
 */
export const GERMAN_TIME_ZONE = 'Europe/Berlin';

interface GermanDateParts {
	year: number;
	month: number; // 1–12
	day: number;
	hour: number;
	minute: number;
	second: number;
	weekday: number; // 0 = Sonntag .. 6 = Samstag
}

const WEEKDAY_INDEX: Record<string, number> = {
	Sun: 0,
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6
};

/** Wandelt einen Zeitpunkt (Date, absoluter Instant) in seine Wanduhrzeit-Bestandteile in Europe/Berlin um. */
export function getGermanDateParts(date: Date): GermanDateParts {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: GERMAN_TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		weekday: 'short',
		hourCycle: 'h23'
	})
		.formatToParts(date)
		.reduce<Record<string, string>>((acc, part) => {
			acc[part.type] = part.value;
			return acc;
		}, {});

	return {
		year: Number(parts.year),
		month: Number(parts.month),
		day: Number(parts.day),
		hour: Number(parts.hour === '24' ? '0' : parts.hour),
		minute: Number(parts.minute),
		second: Number(parts.second),
		weekday: WEEKDAY_INDEX[parts.weekday] ?? 0
	};
}

/** UTC-Offset von Europe/Berlin zum gegebenen Zeitpunkt, z.B. "+02:00" (Sommerzeit) oder "+01:00" (Winterzeit). */
export function getGermanUtcOffset(date: Date): string {
	const offsetPart = new Intl.DateTimeFormat('en-US', {
		timeZone: GERMAN_TIME_ZONE,
		timeZoneName: 'shortOffset'
	})
		.formatToParts(date)
		.find((part) => part.type === 'timeZoneName')?.value;

	const match = offsetPart?.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
	if (!match) return '+00:00';
	const [, sign, hours, minutes] = match;
	return `${sign}${hours.padStart(2, '0')}:${(minutes ?? '00').padStart(2, '0')}`;
}

/**
 * Ob für diesen Zeitpunkt tatsächlich eine Uhrzeit bekannt ist. Ein Event,
 * dessen Wanduhrzeit in Europe/Berlin exakt 00:00:00 ist, gilt als
 * "Uhrzeit unbekannt" (Konvention u.a. der Ingestion-Connectors, die bei
 * Quellen ohne Uhrzeitangabe Mitternacht als Platzhalter eintragen) - für
 * ein tatsächlich um Mitternacht startendes Event gibt es praktisch keinen
 * Anwendungsfall, der diese Konvention kollidieren ließe.
 */
export function hasKnownGermanTime(date: Date): boolean {
	const parts = getGermanDateParts(date);
	return parts.hour !== 0 || parts.minute !== 0 || parts.second !== 0;
}

/**
 * ISO-8601-String mit explizitem Europe/Berlin-Offset statt UTC ("Z") - für
 * `schema.org/Event` `startDate`/`endDate`. Google zeigt einen mit "Z"
 * (UTC) markierten Zeitpunkt in Rich Results teils in der Zeitzone des
 * jeweiligen Suchenden/Crawl-Kontexts an statt in der tatsächlichen
 * Event-Zeitzone - mit explizitem Offset ist die Uhrzeit unabhängig davon
 * eindeutig (siehe AGENTS.md 6, `schema.org/Event` JSON-LD).
 */
export function toGermanIsoString(date: Date): string {
	const p = getGermanDateParts(date);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}${getGermanUtcOffset(date)}`;
}

/** Reines Datum ohne Uhrzeit/Offset, z.B. "2027-04-30" - für Events mit `hasKnownGermanTime(date) === false`. */
export function toGermanIsoDateString(date: Date): string {
	const p = getGermanDateParts(date);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}
