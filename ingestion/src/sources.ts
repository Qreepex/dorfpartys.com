import type { SourceConfig } from './types.js';

/**
 * Registry aller abzufragenden Quellen. Neue Quelle hinzufügen = neuer Eintrag
 * hier, kein Code nötig (solange der passende Connector-Typ schon existiert,
 * siehe `connectors/`). Reihenfolge ist egal, der Runner iteriert alle
 * `enabled !== false`-Einträge.
 *
 * Bewusst nur Quellen ohne Registrierung/API-Key (siehe opendata-quellen.md,
 * Recherche vom 2026-07-22): CKAN-Portale sind frei abfragbar, ICS-Feeds sind
 * öffentlich. Die großen Tourismus-Knowledge-Graphs (Open Data Germany, ÖW
 * Data Hub, Data Hub NRW, Niedersachsen Hub, ...) brauchen einen API-Key -
 * dafür unten ein Platzhalter-Beispiel (`enabled: false`), das zeigt, wie eine
 * neue REST-API mit Key eingebunden wird, sobald einer vorliegt.
 */
export const SOURCES: SourceConfig[] = [
	{
		connector: 'ckan',
		id: 'govdata-national',
		label: 'GovData.de (national, CKAN-Volltextsuche)',
		// Achtung: die CKAN-API läuft unter der ckan.-Subdomain, nicht unter www.govdata.de
		// (das liefert 404 - www.govdata.de ist nur das Such-Frontend, kein API-Host).
		baseUrl: 'https://ckan.govdata.de',
		searchTerms: ['Veranstaltungen', 'Dorffest', 'Schützenfest', 'Feuerwehrfest', 'Vereinsfest', 'Kirmes', 'Erntefest', 'Volksfest'],
		rows: 20
	},
	{
		connector: 'ckan',
		id: 'offenesdatenportal-nrw',
		label: 'offenesdatenportal.de (NRW-Kommunalcluster, CKAN)',
		baseUrl: 'https://www.offenesdatenportal.de',
		searchTerms: ['Veranstaltungen', 'Vereine', 'Feste', 'Kirmes'],
		rows: 30,
		defaultBundesland: 'NW'
	},
	{
		connector: 'ics',
		id: 'lfv-brandenburg',
		label: 'Landesfeuerwehrverband Brandenburg (ICS-Feed)',
		url: 'https://www.lfv-bb.de/feed/eo-events/',
		defaultBundesland: 'BB',
		defaultOrganizer: 'Landesfeuerwehrverband Brandenburg'
	},
	{
		// Aus der Bundesländer-Recherche (siehe ingestion/urls.txt, Abschnitt
		// Mecklenburg-Vorpommern): Die Seite selbst zeigt nur einen "Kalender
		// abonnieren"-Button ohne sichtbare URL. Der echte Feed-Link steckt im
		// `openIcsPopUp`-Handler des Portal-CMS (nonCritical.min.js:
		// `link = additionals.link + '?ics=1'`) - per curl verifiziert, liefert
		// echte VEVENTs mit realen Schützenfest-Terminen (z.B. "Schützenverein
		// Vier Tore e.V. Neubrandenburg", "Schützenverein Greif e.V. Blumenthal").
		// Achtung: Die VEVENTs selbst haben KEIN URL-Feld (anders als z.B.
		// lfv-brandenburg unten) - ohne `fallbackLink` würde `normalizeItem`
		// jedes Item mangels Link verwerfen (per curl gegengeprüft).
		connector: 'ics',
		id: 'lsv-mv-schuetzenfeste',
		label: 'Landesschützenverband Mecklenburg-Vorpommern (ICS-Feed)',
		url: 'https://www.lsv-mv.de/veranstaltungen/index.php?ics=1',
		fallbackLink: 'https://www.lsv-mv.de/veranstaltungen/index.php',
		defaultBundesland: 'MV',
		defaultOrganizer: 'Landesschützenverband Mecklenburg-Vorpommern'
	},
	{
		// Gefunden über den govdata-national-CKAN-Connector (Suchtreffer "Grevenbroich:
		// Volks- und Heimatfeste 2026"), aber dort als generisch bezeichnete Quelle mit
		// zu granularer Stadtteil-Ortsangabe (z.B. "Münchrath"), die unsere
		// Kreis-Referenz nicht auflösen kann (siehe pipeline/normalize.ts) - deshalb
		// hier als eigene, geprüfte CSV-Quelle mit fest hinterlegtem Kreis statt über
		// die generische CKAN-Heuristik. Reale, aktuelle Schützenfest-/Kirmes-Termine.
		connector: 'csv',
		id: 'grevenbroich-volksfeste',
		label: 'Grevenbroich: Volks- und Heimatfeste (Open.NRW/Rhein-Kreis Neuss Open Data)',
		url: 'https://opendata.rhein-kreis-neuss.de/api/v2/catalog/datasets/grevenbroich-volks-und-heimatfeste-2026/exports/csv?use_labels=true',
		delimiter: ';',
		defaultBundesland: 'NW',
		defaultKreis: 'Rhein-Kreis Neuss',
		appendLocationToTitle: true,
		columns: {
			title: ['Veranstaltung'],
			link: ['Informationen'],
			date: ['Datum'],
			location: ['Stadtteil']
		}
	},
	{
		// Über GovData als CKAN-Ressource im ICS-Format gelistet ("API
		// Veranstaltungskalender Stadt Ingolstadt"), aber das ICS selbst hat keine
		// Per-Event-URLs (siehe CKAN-Connector-Fund vom Testlauf). Die zugrunde
		// liegende JSON-API derselben Plattform liefert echte `eventURL`s - direkt
		// als eigene rest-json-Quelle statt über den CKAN-Umweg.
		connector: 'rest-json',
		id: 'ingolstadt-veranstaltungen',
		label: 'Stadt Ingolstadt Veranstaltungskalender (ingolstadt.live JSON-API)',
		url: 'https://ingolstadt.live/api/v1/getAllEvents/',
		itemsPath: 'data',
		defaultBundesland: 'BY',
		defaultKreis: 'Ingolstadt',
		mapping: { title: 'name', link: 'eventURL', date: 'nextDate', description: 'description', category: 'categories[0]' }
	},

	// --- Beispiele für Quellen, die erst mit Zugangsdaten aktiv werden -------
	// `enabled: false` lässt sie im Registry stehen (als Vorlage), ohne dass der
	// Runner sie abfragt. Key in `.env` legen, hier per `process.env` einlesen
	// und `enabled` auf `Boolean(process.env.OEW_API_KEY)` setzen, sobald einer
	// vorliegt (siehe README "Neue Quelle hinzufügen").
	{
		connector: 'rest-json',
		id: 'oew-austria-example',
		label: 'Österreich Werbung Data Hub (Beispiel - benötigt ApiKey, siehe README)',
		enabled: false,
		url: 'https://oew.tourdata.at/api/dataspace/GetJsonProxy.php',
		query: { ObjectType: 'Veranstaltung', County: 'Österreich', ApiKey: process.env.OEW_API_KEY ?? '' },
		// TODO: itemsPath/mapping wurden nicht gegen die echte Response verifiziert
		// (Recherche kannte nur den Endpunkt, kein Feldschema) - vor Aktivierung
		// einmal mit echtem Key gegenprüfen. Außerdem fehlt noch eine
		// Österreich-Kreisreferenz (reference/oesterreich.ts existiert nicht) -
		// bis dahin würden alle Items an der Kreis-Zuordnung scheitern und
		// verworfen werden (siehe pipeline/normalize.ts).
		itemsPath: 'result',
		mapping: { title: 'title', link: 'url', date: 'startDate', location: 'address.city', category: 'category' }
	}
];
