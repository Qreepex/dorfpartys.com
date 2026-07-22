import type { NormalizedEvent } from '../types.js';

export interface FilterOptions {
	/** Events vor diesem Zeitpunkt werden verworfen. Default: jetzt (nur Zukunft, wie im bisherigen manuellen Workflow). */
	notBefore?: Date;
}

/** Zeitliche Relevanzfilterung - Kategorie-/Blocklist-Filterung passiert bereits in normalize.ts (classifyPartyArt). */
export function filterRelevant(events: NormalizedEvent[], options: FilterOptions = {}): NormalizedEvent[] {
	const notBefore = options.notBefore ?? new Date();
	return events.filter((event) => event.datum >= notBefore);
}
