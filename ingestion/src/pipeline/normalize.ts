import { detectEventLinkType } from '@dorfpartys/shared';
import { getBundeslandByCode, matchKreis } from '../reference/bundeslaender.js';
import { classifyPartyArt } from '../reference/keywords.js';
import { parseFlexibleDate } from '../util/date.js';
import { decodeHtmlEntities } from '../util/html.js';
import type { NormalizedEvent, RawItem, SourceConfig } from '../types.js';

export interface NormalizeStats {
	total: number;
	droppedNoTitleOrLink: number;
	droppedNoDate: number;
	droppedNotRelevant: number;
	droppedNoKreis: number;
	kept: number;
}

/**
 * Wandelt ein RawItem in eine finale CSV-Zeile um oder verwirft es. Verwirft
 * absichtlich statt zu raten (kein Fallback-"sonstiges"-Bundesland, kein
 * geratenes Datum) - eine unvollständige Zeile fehlt lieber ganz, als falsche
 * Daten in die CSV zu schreiben.
 */
export function normalizeItem(item: RawItem, source: SourceConfig, stats: NormalizeStats): NormalizedEvent | null {
	stats.total += 1;

	const rawTitle = item.title?.trim();
	const link = item.link?.trim();
	if (!rawTitle || !link) {
		stats.droppedNoTitleOrLink += 1;
		return null;
	}
	const title = decodeHtmlEntities(buildTitle(rawTitle, item.location, source));

	const date = item.date ?? parseFlexibleDate(item.dateRaw);
	if (!date) {
		stats.droppedNoDate += 1;
		return null;
	}

	const classification = classifyPartyArt(title, item.category, item.description);
	if (!classification) {
		stats.droppedNotRelevant += 1;
		return null;
	}

	const kreisMatch = resolveKreis(item, source);
	if (!kreisMatch) {
		stats.droppedNoKreis += 1;
		return null;
	}

	stats.kept += 1;
	return {
		titel: title,
		// Bewusst kein Fallback auf Bundesland-/Kreisname - das ist kein Veranstalter,
		// nur eine falsche Angabe, die echt aussieht. Lieber leer lassen (klar als
		// "unbekannt" erkennbar) als eine plausibel klingende Falschangabe erzeugen.
		veranstalter: decodeHtmlEntities(item.organizer?.trim() || source.defaultOrganizer || ''),
		datum: date,
		bundesland: kreisMatch.bundeslandCode,
		kreis: kreisMatch.kreisName,
		partyart: classification.slug,
		link,
		linktyp: detectEventLinkType(link)
	};
}

function buildTitle(rawTitle: string, location: string | undefined, source: SourceConfig): string {
	if (!source.appendLocationToTitle || !location) return rawTitle;
	if (rawTitle.toLowerCase().includes(location.toLowerCase())) return rawTitle;
	return `${rawTitle} ${location}`;
}

function resolveKreis(item: RawItem, source: SourceConfig): { bundeslandCode: string; bundeslandName: string; kreisName: string } | null {
	// Item-genauer Hinweis (z.B. eine einzelne Zeile in urls.txt) schlägt sowohl
	// Source-Defaults als auch Freitext-Matching - am präzisesten, weil vom
	// Menschen explizit für genau dieses Item angegeben.
	if (item.kreisHint && item.bundeslandHint) {
		const bundesland = getBundeslandByCode(item.bundeslandHint);
		if (bundesland) {
			return { bundeslandCode: bundesland.code, bundeslandName: bundesland.name, kreisName: item.kreisHint };
		}
	}

	if (source.defaultKreis && source.defaultBundesland) {
		const bundesland = getBundeslandByCode(source.defaultBundesland);
		if (bundesland) {
			return { bundeslandCode: bundesland.code, bundeslandName: bundesland.name, kreisName: source.defaultKreis };
		}
	}

	const candidateTexts = [item.location, item.title, item.description].filter(Boolean) as string[];
	for (const text of candidateTexts) {
		const match = matchKreis(text, source.defaultBundesland);
		if (match) return match;
	}

	if (source.defaultBundesland) {
		const bundesland = getBundeslandByCode(source.defaultBundesland);
		if (bundesland && !source.defaultKreis) {
			// Land bekannt, aber kein Kreis im Text auffindbar - lieber verwerfen als
			// einen falschen Kreis zu erfinden (siehe Modulkommentar).
			return null;
		}
	}

	return null;
}
