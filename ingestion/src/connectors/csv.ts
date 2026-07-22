import { parse } from 'csv-parse/sync';
import { fetchText } from '../util/http.js';
import { pickFirst } from '../util/paths.js';
import type { Connector, CsvSourceConfig, RawItem } from '../types.js';

/**
 * Generischer Connector für entfernte CSV-Dateien (Direkt-Downloads oder
 * CKAN-Ressourcen mit `format: CSV`). Spalten werden per Kandidatenliste
 * gematcht (case-insensitive), weil Behörden-CSVs selten einheitliche
 * Header haben ("Titel" vs. "titel" vs. "name" vs. "bezeichnung").
 */
export const csvConnector: Connector<CsvSourceConfig> = {
	async fetch(source) {
		const text = await fetchText(source.url);
		return parseCsvToRawItems(text, source);
	}
};

export function parseCsvToRawItems(text: string, source: CsvSourceConfig): RawItem[] {
	const records = parse(text, {
		columns: true,
		skip_empty_lines: true,
		delimiter: source.delimiter ?? [';', ','],
		relax_column_count: true,
		bom: true
	}) as Record<string, unknown>[];

	const items: RawItem[] = [];
	for (const record of records) {
		const stringRecord = Object.fromEntries(Object.entries(record).map(([k, v]) => [k, v]));
		const title = pickFirst(stringRecord, source.columns.title);
		const link = pickFirst(stringRecord, source.columns.link);
		if (!title || !link) continue;

		items.push({
			sourceId: source.id,
			title,
			link,
			dateRaw: source.columns.date ? pickFirst(stringRecord, source.columns.date) : undefined,
			description: source.columns.description ? pickFirst(stringRecord, source.columns.description) : undefined,
			category: source.columns.category ? pickFirst(stringRecord, source.columns.category) : undefined,
			organizer: source.columns.organizer ? pickFirst(stringRecord, source.columns.organizer) : undefined,
			location: source.columns.location ? pickFirst(stringRecord, source.columns.location) : undefined
		});
	}
	return items;
}
