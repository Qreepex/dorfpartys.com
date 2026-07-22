import { ckanConnector } from './ckan.js';
import { csvConnector } from './csv.js';
import { icsConnector } from './ics.js';
import { restJsonConnector } from './restJson.js';
import { rssConnector } from './rss.js';
import { urlWatchConnector } from './urlWatch.js';
import type { RawItem, SourceConfig } from '../types.js';

/**
 * Neuen Connector-Typ hinzufügen: Interface implementieren (siehe
 * `connectors/rss.ts` für ein einfaches Beispiel), hier einen `case` ergänzen,
 * im `SourceConfig`-Union in `types.ts` den Typ ergänzen. Neue Quelle
 * desselben Typs hinzufügen: einfach ein weiterer Eintrag in `sources.ts` -
 * kein Code nötig.
 */
export async function fetchFromSource(source: SourceConfig): Promise<RawItem[]> {
	switch (source.connector) {
		case 'rss':
			return rssConnector.fetch(source);
		case 'ics':
			return icsConnector.fetch(source);
		case 'rest-json':
			return restJsonConnector.fetch(source);
		case 'csv':
			return csvConnector.fetch(source);
		case 'ckan':
			return ckanConnector.fetch(source);
		case 'url-watch':
			return urlWatchConnector.fetch(source);
	}
}
