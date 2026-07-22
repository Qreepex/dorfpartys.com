import { readFileSync } from 'node:fs';

export interface WatchedUrl {
	url: string;
	bundeslandHint?: string;
	kreisHint?: string;
}

/**
 * Liest `urls.txt`: eine URL pro Zeile, `#`-Kommentare und Leerzeilen werden
 * ignoriert. Optional pro Zeile `URL | BUNDESLAND-CODE | Kreisname`, falls
 * automatisches Kreis-Matching für diese Seite unwahrscheinlich klappt (siehe
 * `urls.txt`-Kopfkommentar).
 */
export function readUrlList(filePath: string): WatchedUrl[] {
	let content: string;
	try {
		content = readFileSync(filePath, 'utf-8');
	} catch {
		return [];
	}

	const entries: WatchedUrl[] = [];
	for (const rawLine of content.split('\n')) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;

		const [urlPart, bundeslandPart, kreisPart] = line.split('|').map((part) => part.trim());
		if (!urlPart) continue;
		entries.push({
			url: urlPart,
			bundeslandHint: bundeslandPart || undefined,
			kreisHint: kreisPart || undefined
		});
	}
	return entries;
}
