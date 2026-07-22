/** Grobe Normalisierung für Dedupe-Vergleiche: lowercase, Umlaute vereinheitlicht, nur alphanumerisch. */
export function slugifyForDedupe(text: string): string {
	return text
		.toLowerCase()
		.replace(/ß/g, 'ss')
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ü/g, 'ue')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
