/**
 * Minimaler Dot-Path-Getter für die REST-JSON-/CKAN-Connectoren - reicht für
 * das übliche "wo im Response-Objekt steckt das Feld"-Mapping, ohne eine volle
 * JSONPath-Bibliothek einzuführen.
 *
 * Beispiele: "result.records", "fields.title", "location.address[0].city"
 */
export function getPath(obj: unknown, path: string | undefined): unknown {
	if (!path) return obj;
	const parts = path
		.replace(/\[(\d+)\]/g, '.$1')
		.split('.')
		.filter(Boolean);

	let current: unknown = obj;
	for (const part of parts) {
		if (current == null) return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

/** Liest den ersten vorhandenen Wert aus mehreren Kandidaten-Spaltennamen (case-insensitive). */
export function pickFirst(record: Record<string, unknown>, candidates: string[]): string | undefined {
	const lowerKeyMap = new Map(Object.keys(record).map((key) => [key.toLowerCase(), key]));
	for (const candidate of candidates) {
		const actualKey = lowerKeyMap.get(candidate.toLowerCase());
		if (actualKey === undefined) continue;
		const value = record[actualKey];
		if (value === undefined || value === null) continue;
		const text = String(value).trim();
		if (text) return text;
	}
	return undefined;
}
