import { fetchJson } from '../util/http.js';
import { getPath } from '../util/paths.js';
import type { Connector, RawItem, RestJsonSourceConfig } from '../types.js';

/**
 * Generischer REST/JSON-Connector. Die Instanz einer beliebigen API wird rein
 * über `mapping` (Dot-Paths relativ zu jedem Item) und `itemsPath` (Dot-Path
 * zum Array in der Response) konfiguriert - kein Code-Änderung nötig, um eine
 * neue API anzubinden. Für Quellen mit API-Key: `headers`/`query` in der
 * Source-Konfiguration setzen (Key selbst über `.env` + `process.env`, nicht
 * hart codieren).
 */
export const restJsonConnector: Connector<RestJsonSourceConfig> = {
	async fetch(source) {
		const url = new URL(source.url);
		if (source.method !== 'POST' && source.query) {
			for (const [key, value] of Object.entries(source.query)) url.searchParams.set(key, value);
		}

		const response = await fetchJson<unknown>(url.toString(), {
			method: source.method ?? 'GET',
			headers: source.headers,
			body:
				source.method === 'POST' && source.query
					? JSON.stringify(source.query)
					: undefined
		});

		const rawItems = source.itemsPath ? getPath(response, source.itemsPath) : response;
		if (!Array.isArray(rawItems)) {
			throw new Error(
				`REST-JSON-Quelle "${source.id}": itemsPath "${source.itemsPath ?? '(root)'}" zeigt auf kein Array.`
			);
		}

		const items: RawItem[] = [];
		for (const rawItem of rawItems) {
			const title = getPath(rawItem, source.mapping.title);
			const link = getPath(rawItem, source.mapping.link);
			if (!title || !link) continue;

			items.push({
				sourceId: source.id,
				title: String(title),
				link: String(link),
				dateRaw: source.mapping.date ? stringOrUndefined(getPath(rawItem, source.mapping.date)) : undefined,
				description: source.mapping.description ? stringOrUndefined(getPath(rawItem, source.mapping.description)) : undefined,
				category: source.mapping.category ? stringOrUndefined(getPath(rawItem, source.mapping.category)) : undefined,
				organizer: source.mapping.organizer ? stringOrUndefined(getPath(rawItem, source.mapping.organizer)) : undefined,
				location: source.mapping.location ? stringOrUndefined(getPath(rawItem, source.mapping.location)) : undefined
			});
		}
		return items;
	}
};

function stringOrUndefined(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	return String(value);
}
