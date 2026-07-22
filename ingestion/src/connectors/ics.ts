import ical from 'node-ical';
import { fetchText } from '../util/http.js';
import type { Connector, IcsSourceConfig, RawItem } from '../types.js';

type IcalTextish = string | { params?: Record<string, string>; val?: string } | undefined;

interface IcalEvent {
	type: string;
	uid?: string;
	summary?: IcalTextish;
	description?: IcalTextish;
	location?: IcalTextish;
	url?: IcalTextish;
	start?: Date;
	organizer?: IcalTextish;
	rrule?: { after(date: Date, inc?: boolean): Date | null };
}

/**
 * node-ical liefert Property-Werte je nach ICS-Zeile entweder als reinen
 * String oder als Objekt mit `val`/`params` (z.B. bei "ORGANIZER;CN=...:mailto:...").
 * Diese Funktion normalisiert beide Fälle auf einen String.
 */
function textish(value: IcalTextish): string | undefined {
	if (!value) return undefined;
	if (typeof value === 'string') return value.replace(/^mailto:/i, '').trim() || undefined;
	const raw = value.params?.CN ?? value.val;
	return raw ? raw.replace(/^mailto:/i, '').trim() || undefined : undefined;
}

/**
 * Parst rohen ICS-Text in RawItems. Eigenständig exportiert (nicht nur als
 * Connector-Methode), weil auch der CKAN-Connector ICS-Ressourcen antrifft
 * (z.B. Stadt Ingolstadt liefert ihren Veranstaltungskalender als
 * CKAN-Ressource im ICS-Format) und dieselbe Parsing-Logik braucht.
 */
export function parseIcsText(text: string, sourceId: string): RawItem[] {
	const parsed = ical.parseICS(text) as Record<string, IcalEvent>;
	const items: RawItem[] = [];
	const now = new Date();

	for (const component of Object.values(parsed)) {
		if (component.type !== 'VEVENT') continue;

		let start = component.start;
		if (component.rrule) {
			const next = component.rrule.after(now, true);
			if (next) start = next;
		}

		items.push({
			sourceId,
			title: textish(component.summary),
			description: textish(component.description),
			location: textish(component.location),
			link: textish(component.url),
			organizer: textish(component.organizer),
			date: start
		});
	}

	return items;
}

/**
 * Generischer iCal/ICS-Connector. Bei wiederkehrenden Terminen (RRULE) wird der
 * nächste zukünftige Termin ab "jetzt" verwendet statt des (evtl. längst
 * vergangenen) ursprünglichen `start`-Werts.
 */
export const icsConnector: Connector<IcsSourceConfig> = {
	async fetch(source) {
		const text = await fetchText(source.url);
		return parseIcsText(text, source.id);
	}
};
