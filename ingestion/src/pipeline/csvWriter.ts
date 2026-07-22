import { existsSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { toCsvDateString } from '../util/date.js';
import { emptySeen, type DedupeSeen } from './dedupe.js';
import type { NormalizedEvent } from '../types.js';

export const CSV_HEADER = 'Titel;Veranstalter;Datum;Bundesland;Kreis;Partyart;Link;Linktyp';
const CSV_COLUMNS = ['Titel', 'Veranstalter', 'Datum', 'Bundesland', 'Kreis', 'Partyart', 'Link', 'Linktyp'] as const;

function escapeCsvField(value: string): string {
	if (/[;"\n\r]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

function toCsvLine(event: NormalizedEvent): string {
	return [
		event.titel,
		event.veranstalter,
		toCsvDateString(event.datum),
		event.bundesland,
		event.kreis,
		event.partyart,
		event.link,
		event.linktyp
	]
		.map((field) => escapeCsvField(String(field)))
		.join(';');
}

/**
 * Liest die vorhandene CSV (falls vorhanden) und liefert deren Fingerprints/
 * Links, damit `dedupeEvents` neue Funde nicht doppelt gegen bereits
 * eingetragene Zeilen schreibt - die Pipeline ergänzt die Datei, statt sie zu
 * überschreiben.
 */
export function loadExistingFingerprints(csvPath: string): DedupeSeen {
	const seen = emptySeen();
	if (!existsSync(csvPath)) return seen;

	const content = readFileSync(csvPath, 'utf-8');
	if (!content.trim()) return seen;

	const records = parse(content, {
		columns: CSV_COLUMNS as unknown as string[],
		delimiter: ';',
		from_line: 2,
		relax_column_count: true,
		skip_empty_lines: true
	}) as Record<(typeof CSV_COLUMNS)[number], string>[];

	for (const record of records) {
		if (!record.Titel || !record.Datum || !record.Kreis) continue;
		const day = record.Datum.slice(0, 10);
		seen.fingerprints.add(`${slugifyLike(record.Titel)}|${day}|${slugifyLike(record.Kreis)}`);
		if (record.Link) seen.links.add(record.Link.trim().toLowerCase());
	}
	return seen;
}

// Lokale Kopie statt Import, um exakt denselben Fingerprint-Algorithmus wie
// dedupe.ts zu erzwingen, ohne einen zirkulären Re-Export zu brauchen.
function slugifyLike(text: string): string {
	return text
		.toLowerCase()
		.replace(/ß/g, 'ss')
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ü/g, 'ue')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Hängt neue, bereits deduplizierte Events an die CSV an. Legt die Datei samt
 * Header an, falls sie noch nicht existiert. Erwartet, dass `events` bereits
 * gegen `loadExistingFingerprints(csvPath)` gefiltert wurde (siehe `run.ts`).
 */
export function appendEventsToCsv(csvPath: string, events: NormalizedEvent[]): void {
	if (events.length === 0) return;

	const lines = events.map(toCsvLine);
	if (!existsSync(csvPath)) {
		writeFileSync(csvPath, [CSV_HEADER, ...lines].join('\n') + '\n', 'utf-8');
		return;
	}

	const existing = readFileSync(csvPath, 'utf-8');
	const needsLeadingNewline = existing.length > 0 && !existing.endsWith('\n');
	appendFileSync(csvPath, (needsLeadingNewline ? '\n' : '') + lines.join('\n') + '\n', 'utf-8');
}
