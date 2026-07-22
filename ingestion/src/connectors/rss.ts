import { XMLParser } from 'fast-xml-parser';
import { fetchText } from '../util/http.js';
import type { Connector, RawItem, RssSourceConfig } from '../types.js';

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	textNodeName: '#text',
	trimValues: true
});

function asArray<T>(value: T | T[] | undefined): T[] {
	if (value === undefined) return [];
	return Array.isArray(value) ? value : [value];
}

function textOf(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value === 'string') return value.trim() || undefined;
	if (typeof value === 'object' && '#text' in (value as Record<string, unknown>)) {
		return textOf((value as Record<string, unknown>)['#text']);
	}
	return String(value).trim() || undefined;
}

/**
 * Generischer RSS 2.0- und Atom-Connector. Deckt beide Formate ab, weil viele
 * kommunale "Veranstaltungen"-Feeds historisch RSS 2.0 sind, neuere CMS aber
 * oft Atom liefern.
 */
export const rssConnector: Connector<RssSourceConfig> = {
	async fetch(source) {
		const xml = await fetchText(source.url);
		const doc = parser.parse(xml) as Record<string, unknown>;

		const rssItems = asArray(
			(doc.rss as Record<string, unknown> | undefined)?.channel &&
				((doc.rss as Record<string, Record<string, unknown>>).channel.item as unknown)
		);
		if (rssItems.length > 0) {
			return rssItems.map((item) => toRawItemFromRss(item as Record<string, unknown>, source.id));
		}

		const atomEntries = asArray((doc.feed as Record<string, unknown> | undefined)?.entry);
		return atomEntries.map((entry) => toRawItemFromAtom(entry as Record<string, unknown>, source.id));
	}
};

function toRawItemFromRss(item: Record<string, unknown>, sourceId: string): RawItem {
	const link = textOf(item.link) ?? textOf((item.guid as Record<string, unknown> | undefined)?.['#text']);
	return {
		sourceId,
		title: textOf(item.title),
		description: textOf(item.description),
		category: asArray(item.category).map(textOf).filter(Boolean).join(', ') || undefined,
		link,
		dateRaw: textOf(item.pubDate) ?? textOf(item['dc:date'])
	};
}

function toRawItemFromAtom(entry: Record<string, unknown>, sourceId: string): RawItem {
	const linkField = entry.link;
	let link: string | undefined;
	if (typeof linkField === 'string') {
		link = linkField;
	} else if (Array.isArray(linkField)) {
		const href = linkField.find((l) => typeof l === 'object' && l !== null)?.['@_href'];
		link = typeof href === 'string' ? href : undefined;
	} else if (linkField && typeof linkField === 'object') {
		const href = (linkField as Record<string, unknown>)['@_href'];
		link = typeof href === 'string' ? href : undefined;
	}

	return {
		sourceId,
		title: textOf(entry.title),
		description: textOf(entry.summary) ?? textOf(entry.content),
		category: asArray(entry.category)
			.map((c) => (typeof c === 'object' ? (c as Record<string, unknown>)['@_term'] : c))
			.filter(Boolean)
			.join(', ') || undefined,
		link,
		dateRaw: textOf(entry.published) ?? textOf(entry.updated)
	};
}
