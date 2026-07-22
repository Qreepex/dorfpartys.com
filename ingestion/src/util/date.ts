const GERMAN_DATE_TIME = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
const GERMAN_DATE_RANGE_START = /^(\d{1,2})\.(\d{1,2})\.(?:\d{4})?\s*[-–]\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/;

/**
 * Parst Datumsangaben aus heterogenen Quellen (ISO 8601, deutsches
 * TT.MM.JJJJ[ HH:MM], RFC 2822 aus RSS-`pubDate`, "TT.MM. - TT.MM.JJJJ"-Ranges
 * aus Terminlisten - nimmt dabei den Start). Gibt `null` zurück statt eine
 * unsichere Annahme zu treffen - die Pipeline verwirft Zeilen ohne valides
 * Datum, statt zu raten.
 */
export function parseFlexibleDate(raw: string | undefined | null): Date | null {
	if (!raw) return null;
	const text = raw.trim();
	if (!text) return null;

	const germanMatch = GERMAN_DATE_TIME.exec(text);
	if (germanMatch) {
		const [, day, month, year, hour, minute, second] = germanMatch;
		const date = new Date(
			Number(year),
			Number(month) - 1,
			Number(day),
			hour ? Number(hour) : 0,
			minute ? Number(minute) : 0,
			second ? Number(second) : 0
		);
		return Number.isNaN(date.getTime()) ? null : date;
	}

	const rangeMatch = GERMAN_DATE_RANGE_START.exec(text);
	if (rangeMatch) {
		const [, day, month, , , year] = rangeMatch;
		const date = new Date(Number(year), Number(month) - 1, Number(day));
		return Number.isNaN(date.getTime()) ? null : date;
	}

	// ISO 8601 und RFC 2822 (RSS pubDate) versteht der native Date-Parser zuverlässig.
	const parsed = new Date(text);
	if (!Number.isNaN(parsed.getTime())) return parsed;

	return null;
}

/** Formatiert als lokale ISO-artige Zeichenkette ohne Zeitzonen-Suffix, wie im CSV-Format gefordert. */
export function toCsvDateString(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	const year = date.getFullYear();
	const month = pad(date.getMonth() + 1);
	const day = pad(date.getDate());
	const hours = pad(date.getHours());
	const minutes = pad(date.getMinutes());
	const seconds = pad(date.getSeconds());
	return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}
