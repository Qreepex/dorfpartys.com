import { slugifyForDedupe } from '../util/text.js';
import type { NormalizedEvent } from '../types.js';

/** Titel+Tag+Kreis - fängt Dubletten über mehrere Quellen hinweg ab, auch bei leicht abweichenden Links. */
export function buildFingerprint(event: NormalizedEvent): string {
	const day = event.datum.toISOString().slice(0, 10);
	return `${slugifyForDedupe(event.titel)}|${day}|${slugifyForDedupe(event.kreis)}`;
}

export interface DedupeSeen {
	fingerprints: Set<string>;
	links: Set<string>;
}

export function emptySeen(): DedupeSeen {
	return { fingerprints: new Set(), links: new Set() };
}

/**
 * Entfernt Dubletten innerhalb des neuen Batches UND gegen bereits bekannte
 * Einträge (z.B. aus der schon existierenden CSV, siehe `csvWriter.ts`).
 * `seen` wird dabei mutiert, sodass aufeinanderfolgende Aufrufe (mehrere
 * Quellen nacheinander) sich gegenseitig berücksichtigen.
 */
export function dedupeEvents(events: NormalizedEvent[], seen: DedupeSeen = emptySeen()): NormalizedEvent[] {
	const result: NormalizedEvent[] = [];
	for (const event of events) {
		const fingerprint = buildFingerprint(event);
		const link = event.link.trim().toLowerCase();
		if (seen.fingerprints.has(fingerprint) || seen.links.has(link)) continue;
		seen.fingerprints.add(fingerprint);
		seen.links.add(link);
		result.push(event);
	}
	return result;
}
