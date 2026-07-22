import type { Connector, RawItem, UrlWatchSourceConfig } from '../types.js';
import { extractPlainText } from '../util/html.js';
import { fetchText } from '../util/http.js';
import { extractJsonLdEvents, locationToText, organizerToText } from '../util/jsonld.js';
import { extractEventWithLlm } from '../util/llm.js';
import { readUrlList } from '../util/urlList.js';

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verarbeitet die in `urls.txt` gelisteten Seiten: zuerst schema.org/Event
 * JSON-LD versuchen (zuverlässig, strukturiert), sonst - falls `llm`
 * konfiguriert ist - den Seitentext an eine OpenWebUI-Instanz zur
 * Best-Effort-Extraktion schicken. Für Details/Grenzen siehe README
 * "URL-Watchlist".
 */
export const urlWatchConnector: Connector<UrlWatchSourceConfig> = {
	async fetch(source) {
		const urls = readUrlList(source.urlsFile);
		if (urls.length === 0) {
			console.warn(`[url-watch:${source.id}] ${source.urlsFile} ist leer oder nicht auffindbar - nichts zu tun.`);
			return [];
		}

		const items: RawItem[] = [];
		const delayMs = source.delayMs ?? 500;

		for (const entry of urls) {
			console.log(`[url-watch:${source.id}] ${entry.url}: wird abgefragt...`);

			try {
				const html = await fetchText(entry.url);
				console.log(`[url-watch:${source.id}] ${entry.url}: ${html.length} Bytes HTML erhalten, wird verarbeitet...`);
				const jsonLdEvents = extractJsonLdEvents(html);

				if (jsonLdEvents.length > 0) {
					for (const jsonLdEvent of jsonLdEvents) {
						items.push({
							sourceId: `${source.id}:jsonld`,
							title: jsonLdEvent.name,
							description: typeof jsonLdEvent.description === 'string' ? jsonLdEvent.description : undefined,
							link: typeof jsonLdEvent.url === 'string' ? jsonLdEvent.url : entry.url,
							dateRaw: jsonLdEvent.startDate,
							location: locationToText(jsonLdEvent.location),
							organizer: organizerToText(jsonLdEvent.organizer),
							bundeslandHint: entry.bundeslandHint,
							kreisHint: entry.kreisHint
						});
					}
					console.log(`[url-watch:${source.id}] ${entry.url}: ${jsonLdEvents.length} Event(s) via JSON-LD gefunden.`);
				} else if (source.llm) {
					console.log(`[url-watch:${source.id}] ${entry.url}: kein JSON-LD gefunden, LLM-Fallback wird versucht...`);

					const pageText = extractPlainText(html);

					console.log(`[url-watch:${source.id}] ${entry.url}: ${pageText.length} Bytes Klartext extrahiert, wird an LLM geschickt...`);

					const extracted = await extractEventWithLlm(pageText, entry.url, source.llm);

					console.log(`[url-watch:${source.id}] ${entry.url}: LLM-Fallback abgeschlossen, Ergebnis: ${extracted ? JSON.stringify(extracted) : 'null'}`);

					if (extracted?.found) {
						items.push({
							sourceId: `${source.id}:llm`,
							title: extracted.title ?? undefined,
							link: entry.url,
							dateRaw: extracted.date ?? undefined,
							location: extracted.location ?? undefined,
							organizer: extracted.organizer ?? undefined,
							bundeslandHint: extracted.bundesland ?? entry.bundeslandHint,
							kreisHint: extracted.kreis ?? entry.kreisHint
						});
						console.log(`[url-watch:${source.id}] ${entry.url}: Event via LLM erkannt - bitte gegenprüfen ("${extracted.title}").`);
					} else {
						console.log(`[url-watch:${source.id}] ${entry.url}: kein JSON-LD, LLM fand keine Veranstaltung.`);
					}
				} else {
					console.log(`[url-watch:${source.id}] ${entry.url}: kein JSON-LD gefunden, kein LLM konfiguriert - übersprungen.`);
				}
			} catch (error) {
				console.warn(`[url-watch:${source.id}] ${entry.url} fehlgeschlagen: ${(error as Error).message}`);
			}

			if (delayMs > 0) await sleep(delayMs);
		}

		return items;
	}
};
