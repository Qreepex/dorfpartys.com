import type { EventLinkType } from '@dorfpartys/shared';

/** Rohes, noch unnormalisiertes Event, wie ein Connector es aus einer Quelle liefert. */
export interface RawItem {
	/** ID der Quelle, aus der dieses Item stammt (für Debugging/Provenienz, landet nicht im CSV). */
	sourceId: string;
	title?: string;
	description?: string;
	/** Freitext-Kategorie/Tags der Quelle, hilft bei der Partyart-Klassifikation. */
	category?: string;
	organizer?: string;
	link?: string;
	/** Rohes Datum als Text, falls die Quelle kein geparstes Date liefert. */
	dateRaw?: string;
	/** Bereits geparstes Datum (z.B. von ICS-Connector, der das nativ liefert). */
	date?: Date;
	/** Freitext-Ortsangabe (Ort, Kreis, Adresse) - wird gegen die Kreis-Referenz gematcht. */
	location?: string;
	/**
	 * Item-genauer Bundesland-/Kreis-Hinweis, hat Vorrang vor Source-weiten
	 * Defaults UND Freitext-Matching. Für Connectoren, bei denen einzelne Items
	 * derselben Quelle unterschiedliche Orte betreffen (z.B. url-watch, wo pro
	 * Zeile in urls.txt ein eigener Hinweis angegeben werden kann).
	 */
	bundeslandHint?: string;
	kreisHint?: string;
}

/** Finale, für den CSV-Export normalisierte Zeile. */
export interface NormalizedEvent {
	titel: string;
	veranstalter: string;
	datum: Date;
	bundesland: string;
	kreis: string;
	partyart: string;
	link: string;
	linktyp: EventLinkType;
}

/** Felder, die auf jeder Source-Konfiguration verfügbar sind, unabhängig vom Connector-Typ. */
export interface SourceBase {
	id: string;
	label: string;
	/** Wenn gesetzt, überspringt der Runner diese Quelle (z.B. während Debugging einer einzelnen Source). */
	enabled?: boolean;
	/**
	 * Wenn die Quelle nur ein Bundesland abdeckt (z.B. ein Landesfeuerwehrverband),
	 * spart das Setzen dieses Felds die Freitext-Kreis-Suche im gesamten
	 * Bundesgebiet und macht das Matching präziser.
	 */
	defaultBundesland?: string;
	/** Wenn die Quelle exakt einem Kreis zugeordnet ist (z.B. ein kommunales Portal). */
	defaultKreis?: string;
	/** Fallback-Veranstalter, falls das Item selbst keinen liefert. */
	defaultOrganizer?: string;
	/**
	 * Manche Quellen liefern generische Titel ("Schützenfest") und den Ort in
	 * einem separaten Feld (z.B. Stadtteil-Kirmeskalender). Wenn gesetzt und
	 * `location` nicht schon im Titel steckt, wird sie angehängt ("Schützenfest
	 * Neukirchen"). Bewusst opt-in statt global, weil `location` bei anderen
	 * Quellen eine ganze Adresse sein kann, die den Titel nur aufbläht.
	 */
	appendLocationToTitle?: boolean;
}

export interface RssSourceConfig extends SourceBase {
	connector: 'rss';
	url: string;
}

export interface IcsSourceConfig extends SourceBase {
	connector: 'ics';
	url: string;
}

/** Mapping von normalisierten Feldnamen auf Dot-Paths relativ zu einem Item-Objekt. */
export interface FieldMapping {
	title: string;
	link: string;
	/** Optional, wenn date direkt als ISO-String im Feld steht. */
	date?: string;
	description?: string;
	category?: string;
	organizer?: string;
	location?: string;
}

export interface RestJsonSourceConfig extends SourceBase {
	connector: 'rest-json';
	url: string;
	method?: 'GET' | 'POST';
	/** Query-Parameter, werden an die URL angehängt (GET) oder als JSON-Body gesendet (POST). */
	query?: Record<string, string>;
	headers?: Record<string, string>;
	/** Dot-Path zum Array der einzelnen Items innerhalb der Response, z.B. "result.records". Leer = Response ist bereits das Array. */
	itemsPath?: string;
	mapping: FieldMapping;
}

export interface CsvSourceConfig extends SourceBase {
	connector: 'csv';
	url: string;
	delimiter?: string;
	/** Spaltennamen-Mapping (Header-Zeile -> normalisierte Felder). Mehrere Kandidaten pro Feld möglich. */
	columns: {
		title: string[];
		link: string[];
		date?: string[];
		description?: string[];
		category?: string[];
		organizer?: string[];
		location?: string[];
	};
}

export interface CkanSourceConfig extends SourceBase {
	connector: 'ckan';
	/** Basis-URL der CKAN-Instanz ohne trailing slash, z.B. "https://www.govdata.de". */
	baseUrl: string;
	/** Suchbegriffe für package_search (werden einzeln abgefragt und dedupliziert). */
	searchTerms: string[];
	/** Max. Anzahl Datensätze pro Suchbegriff (CKAN `rows`-Parameter). */
	rows?: number;
}

export interface LlmConfig {
	baseUrl: string;
	apiKey: string;
	model: string;
}

export interface UrlWatchSourceConfig extends SourceBase {
	connector: 'url-watch';
	/** Pfad zur Datei mit einer URL pro Zeile (siehe `urls.txt`). */
	urlsFile: string;
	/** Wenn gesetzt, Fallback-Extraktion per LLM (OpenWebUI) für Seiten ohne JSON-LD-Event. */
	llm?: LlmConfig;
	/** Millisekunden Pause zwischen zwei URL-Abrufen (Höflichkeitsverzögerung). Default 500. */
	delayMs?: number;
}

export type SourceConfig =
	| RssSourceConfig
	| IcsSourceConfig
	| RestJsonSourceConfig
	| CsvSourceConfig
	| CkanSourceConfig
	| UrlWatchSourceConfig;

export interface Connector<T extends SourceConfig = SourceConfig> {
	fetch(source: T): Promise<RawItem[]>;
}
