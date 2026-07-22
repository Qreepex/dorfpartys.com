/** Minimal typisierte Sicht auf ein schema.org/Event-JSON-LD-Objekt - reale Seiten liefern oft mehr Felder. */
export interface JsonLdEvent {
	name?: string;
	startDate?: string;
	url?: string;
	description?: string;
	location?: unknown;
	organizer?: unknown;
	[key: string]: unknown;
}

const SCRIPT_TAG_PATTERN = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function isEventType(typeValue: unknown): boolean {
	if (typeof typeValue === 'string') return typeValue.toLowerCase().includes('event');
	if (Array.isArray(typeValue)) return typeValue.some(isEventType);
	return false;
}

/** Läuft rekursiv durch ein geparstes JSON-LD-Dokument (inkl. `@graph`-Arrays) und sammelt alle Event-artigen Objekte. */
function collectEvents(node: unknown, out: JsonLdEvent[]): void {
	if (Array.isArray(node)) {
		for (const item of node) collectEvents(item, out);
		return;
	}
	if (!node || typeof node !== 'object') return;

	const obj = node as Record<string, unknown>;
	if (isEventType(obj['@type'])) out.push(obj as JsonLdEvent);
	if (Array.isArray(obj['@graph'])) collectEvents(obj['@graph'], out);
}

/**
 * Extrahiert alle schema.org/Event-Objekte aus den `<script type="application/ld+json">`-
 * Blöcken einer HTML-Seite. Robust gegenüber mehreren Script-Tags, `@graph`-
 * Wrappern und Arrays von Objekten pro Block. Ungültiges JSON in einem Block
 * wird übersprungen (mit Warnung), statt die ganze Seite zu verwerfen - manche
 * CMS liefern mehrere JSON-LD-Blöcke, nicht alle davon müssen Events sein oder
 * valide sein.
 */
export function extractJsonLdEvents(html: string): JsonLdEvent[] {
	const events: JsonLdEvent[] = [];
	for (const match of html.matchAll(SCRIPT_TAG_PATTERN)) {
		const raw = match[1]?.trim();
		if (!raw) continue;
		try {
			const parsed = JSON.parse(raw);
			collectEvents(parsed, events);
		} catch {
			// Ungültiges JSON in diesem Block - überspringen, nicht die ganze Seite verwerfen.
			continue;
		}
	}
	return events;
}

/** Löst schema.org `location` (Place|PostalAddress|string|Array) in einen möglichst matchbaren Freitext auf. */
export function locationToText(location: unknown): string | undefined {
	if (!location) return undefined;
	if (typeof location === 'string') return location;
	if (Array.isArray(location)) return locationToText(location[0]);
	if (typeof location === 'object') {
		const loc = location as Record<string, unknown>;
		if (typeof loc.name === 'string' && loc.address) {
			const addressText = locationToText(loc.address);
			return addressText ? `${loc.name}, ${addressText}` : loc.name;
		}
		if (typeof loc.name === 'string') return loc.name;
		if (loc.address) return locationToText(loc.address);
		// PostalAddress
		const parts = [loc.addressLocality, loc.addressRegion, loc.postalCode].filter(
			(p): p is string => typeof p === 'string' && p.length > 0
		);
		if (parts.length > 0) return parts.join(', ');
	}
	return undefined;
}

/** Löst schema.org `organizer` (Organization|Person|string) in einen Namen auf. */
export function organizerToText(organizer: unknown): string | undefined {
	if (!organizer) return undefined;
	if (typeof organizer === 'string') return organizer;
	if (Array.isArray(organizer)) return organizerToText(organizer[0]);
	if (typeof organizer === 'object') {
		const org = organizer as Record<string, unknown>;
		if (typeof org.name === 'string') return org.name;
	}
	return undefined;
}
