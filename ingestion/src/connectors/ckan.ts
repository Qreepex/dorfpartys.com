import { fetchJson, fetchText } from '../util/http.js';
import { pickFirst } from '../util/paths.js';
import { parseCsvToRawItems } from './csv.js';
import { parseIcsText } from './ics.js';
import type { CkanSourceConfig, Connector, CsvSourceConfig, RawItem } from '../types.js';

/**
 * Spaltennamen-Kandidaten für Behörden-CSV/JSON-Ressourcen ohne bekanntes
 * Schema. CKAN-Datensätze sind heterogen gepflegt (jede Kommune ihr eigenes
 * Format) - das hier ist bewusst ein Kompromiss ("best effort" statt exaktes
 * Mapping wie bei den anderen Connectoren). Ergebnisse aus dem CKAN-Connector
 * sollten öfter stichprobenartig geprüft werden als die anderer Connectoren.
 */
const HEURISTIC_COLUMNS: CsvSourceConfig['columns'] = {
	title: ['titel', 'title', 'name', 'bezeichnung', 'veranstaltung', 'veranstaltungsname', 'event', 'eventname', 'überschrift'],
	link: ['link', 'url', 'weblink', 'webseite', 'website', 'detailurl', 'permalink', 'quelle'],
	date: ['datum', 'date', 'start', 'startdatum', 'beginn', 'von', 'event_date', 'termin', 'veranstaltungsdatum'],
	description: ['beschreibung', 'description', 'text', 'inhalt', 'details', 'beschreibungstext'],
	category: ['kategorie', 'category', 'typ', 'art', 'tags', 'schlagworte', 'thema'],
	organizer: ['veranstalter', 'organizer', 'anbieter', 'träger', 'traeger', 'verein', 'ausrichter'],
	location: ['ort', 'location', 'adresse', 'veranstaltungsort', 'stadt', 'gemeinde', 'kreis', 'plz und ort']
};

interface CkanResource {
	id: string;
	url?: string;
	format?: string;
	name?: string;
}

interface CkanPackage {
	id: string;
	name: string;
	title: string;
	resources: CkanResource[];
}

interface CkanSearchResponse {
	success: boolean;
	result: { count: number; results: CkanPackage[] };
}

/**
 * Generischer CKAN-Connector (govdata.de, offenesdatenportal.de, opendata.swiss,
 * data.gv.at, viele Landes-/Kommunalportale laufen auf CKAN). Sucht Datensätze
 * per `package_search`, lädt darin verlinkte CSV/JSON-Ressourcen direkt herunter
 * und wendet eine Spalten-Heuristik an, da jedes CKAN-Portal eigene Feldnamen
 * verwendet. Nicht unterstützte Formate (XML, XLSX, WFS, PDF, ...) werden
 * übersprungen - dafür eignet sich eher ein dedizierter rest-json/csv-Connector,
 * sobald man das konkrete Schema kennt.
 */
export const ckanConnector: Connector<CkanSourceConfig> = {
	async fetch(source) {
		const rows = source.rows ?? 20;
		const packagesById = new Map<string, CkanPackage>();

		for (const term of source.searchTerms) {
			const searchUrl = new URL(`${source.baseUrl}/api/3/action/package_search`);
			searchUrl.searchParams.set('q', term);
			searchUrl.searchParams.set('rows', String(rows));

			let response: CkanSearchResponse;
			try {
				response = await fetchJson<CkanSearchResponse>(searchUrl.toString());
			} catch (error) {
				console.warn(`[ckan:${source.id}] Suche nach "${term}" fehlgeschlagen: ${(error as Error).message}`);
				continue;
			}

			for (const pkg of response.result?.results ?? []) {
				packagesById.set(pkg.id, pkg);
			}
		}

		const items: RawItem[] = [];
		for (const pkg of packagesById.values()) {
			for (const resource of pkg.resources ?? []) {
				if (!resource.url) continue;
				const format = resolveResourceFormat(resource);

				try {
					if (format === 'csv') {
						const csvText = await fetchText(resource.url);
						items.push(...parseCsvToRawItems(csvText, syntheticCsvConfig(source)));
					} else if (format === 'json') {
						items.push(...(await fetchAndMapJsonResource(resource.url, source.id)));
					} else if (format === 'ics') {
						const icsText = await fetchText(resource.url);
						items.push(...parseIcsText(icsText, source.id));
					}
					// Andere Formate (XML, XLSX, WFS, PDF, ...) bewusst übersprungen, siehe Doku-Kommentar oben.
				} catch (error) {
					console.warn(
						`[ckan:${source.id}] Ressource "${resource.name ?? resource.id}" (${pkg.title}) konnte nicht gelesen werden: ${(error as Error).message}`
					);
				}
			}
		}
		return items;
	}
};

/**
 * Format-Erkennung ist überraschend uneinheitlich zwischen CKAN-Instanzen:
 * - offenesdatenportal.de/Kommunalportale: schlichtes `"CSV"`/`"JSON"`.
 * - govdata.de (DCAT-AP.de-harvestet): EU-Publications-Office-Vokabular-URIs
 *   wie `"http://publications.europa.eu/resource/authority/file-type/CSV"` -
 *   ein reiner `=== 'csv'`-Vergleich läuft hier ins Leere, deshalb wird immer
 *   nur das letzte URI-Segment ausgewertet.
 * - Manche harvesteten Einträge (v.a. WFS/Geoserver-Quellen) lassen das Feld
 *   ganz leer, obwohl die URL eindeutig auf JSON/CSV/ICS zeigt (z.B.
 *   `outputFormat=application/json`, `?type=ics`) - Fallback auf URL-Heuristik,
 *   bevor eine Ressource als "nicht unterstützt" übersprungen wird.
 */
function resolveResourceFormat(resource: CkanResource): 'csv' | 'json' | 'ics' | 'other' {
	const rawFormat = (resource.format ?? '').trim();
	const lastSegment = rawFormat.includes('/') ? (rawFormat.split('/').pop() ?? '') : rawFormat;
	const declared = lastSegment.toLowerCase();
	if (declared === 'csv') return 'csv';
	if (declared === 'json' || declared === 'geojson') return 'json';
	if (declared === 'ics' || declared === 'ical' || declared === 'icalendar') return 'ics';

	const url = (resource.url ?? '').toLowerCase();
	if (/outputformat=(application%2f)?json|\.geojson(\?|$)|\.json(\?|$)/.test(url)) return 'json';
	if (/\.csv(\?|$)/.test(url)) return 'csv';
	if (/\.ics(\?|$)|[?&]type=ics(&|$)/.test(url)) return 'ics';
	return 'other';
}

function syntheticCsvConfig(source: CkanSourceConfig): CsvSourceConfig {
	return {
		connector: 'csv',
		id: source.id,
		label: source.label,
		url: '',
		columns: HEURISTIC_COLUMNS,
		defaultBundesland: source.defaultBundesland,
		defaultKreis: source.defaultKreis,
		defaultOrganizer: source.defaultOrganizer
	};
}

async function fetchAndMapJsonResource(url: string, sourceId: string): Promise<RawItem[]> {
	const text = await fetchText(url);
	const data = parseJsonOrJsonLines(text);
	const obj = data as Record<string, unknown>;

	// GeoJSON FeatureCollection (typisch für WFS-Ressourcen): Attribute stecken in `properties`.
	if (Array.isArray(obj?.features)) {
		const features = obj.features as Array<{ properties?: Record<string, unknown> }>;
		return mapFlatRecords(
			features.map((f) => f.properties ?? {}),
			sourceId
		);
	}

	const records = Array.isArray(data)
		? data
		: Array.isArray(obj?.result)
			? (obj.result as unknown[])
			: Array.isArray((obj?.result as Record<string, unknown> | undefined)?.records)
				? ((obj.result as Record<string, unknown>).records as unknown[])
				: null;
	if (!records) return [];

	return mapFlatRecords(records, sourceId);
}

/**
 * Manche als "JSON" deklarierten Ressourcen sind tatsächlich JSON Lines
 * (ein Objekt pro Zeile, kein umschließendes Array/`{...}`-Root) - typisch für
 * OpenDataSoft-Exporte (`.../exports/jsonl`), die von harvestenden
 * CKAN-Instanzen wie govdata.de fälschlich als generisches "JSON" gelistet
 * werden. `JSON.parse` scheitert daran mit "Unexpected non-whitespace
 * character..." - bei diesem Fehlerbild zeilenweise nachparsen statt die
 * Ressource ganz zu verwerfen.
 */
function parseJsonOrJsonLines(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		const lines = text
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);
		return lines.map((line) => JSON.parse(line));
	}
}

function mapFlatRecords(records: unknown[], sourceId: string): RawItem[] {
	const items: RawItem[] = [];
	for (const record of records) {
		if (typeof record !== 'object' || record === null) continue;
		const flat = record as Record<string, unknown>;
		const title = pickFirst(flat, HEURISTIC_COLUMNS.title);
		const link = pickFirst(flat, HEURISTIC_COLUMNS.link);
		if (!title || !link) continue;

		items.push({
			sourceId,
			title,
			link,
			dateRaw: pickFirst(flat, HEURISTIC_COLUMNS.date ?? []),
			description: pickFirst(flat, HEURISTIC_COLUMNS.description ?? []),
			category: pickFirst(flat, HEURISTIC_COLUMNS.category ?? []),
			organizer: pickFirst(flat, HEURISTIC_COLUMNS.organizer ?? []),
			location: pickFirst(flat, HEURISTIC_COLUMNS.location ?? [])
		});
	}
	return items;
}
