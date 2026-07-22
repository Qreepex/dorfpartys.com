const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	szlig: 'ß',
	uuml: 'ü',
	ouml: 'ö',
	auml: 'ä',
	Uuml: 'Ü',
	Ouml: 'Ö',
	Auml: 'Ä'
};

/**
 * Manche Quellen (z.B. die Ingolstadt-Event-API) liefern Titel/Beschreibungen
 * mit HTML-Entities im JSON-Text ("Rockabella &amp; The Giddyups" statt "&").
 * Deckt die gängigen benannten Entities sowie numerische (`&#39;`, `&#xE4;`) ab -
 * keine vollständige HTML-Entity-Tabelle, aber genug für Veranstaltungstitel.
 */
export function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
		.replace(/&([a-zA-Z]+);/g, (match, name: string) => NAMED_ENTITIES[name] ?? match);
}

/**
 * Grobe HTML-zu-Text-Extraktion für die LLM-Fallback-Erkennung (`url-watch`-
 * Connector) - kein DOM-Parser, nur Script/Style-Blöcke raus, Tags raus,
 * Entities dekodieren, Whitespace zusammenfassen. Für "LLM liest den Text"
 * reicht das; für strukturierte Extraktion wird ohnehin zuerst JSON-LD
 * versucht (siehe `util/jsonld.ts`).
 */
export function extractPlainText(html: string): string {
	const withoutNoise = html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<!--[\s\S]*?-->/g, ' ');
	const withoutTags = withoutNoise.replace(/<[^>]+>/g, ' ');
	return decodeHtmlEntities(withoutTags).replace(/\s+/g, ' ').trim();
}
