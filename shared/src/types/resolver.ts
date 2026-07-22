import type { Country } from '../constants/index.js';
import type { EventListItem } from './event.js';

export interface ResolvedFilters {
	country: Country;
	bundeslandSlug: string | null;
	kreisSlug: string | null;
	artSlug: string | null;
}

export interface ResolveRedirect {
	kind: 'redirect';
	location: string;
	permanent: true; // immer 301, siehe AGENTS.md 1.4
}

export interface ResolvedFilterNames {
	country: Country;
	bundeslandName: string | null;
	kreisName: string | null;
	artName: string | null;
}

/** Pro Segment-Kombination eindeutiger SEO-Text, serverseitig aus den Klarnamen gebaut. */
export interface ResolvedSeoCopy {
	title: string;
	description: string;
	h1: string;
	intro: string;
	/**
	 * Zusätzliche, individuelle Absätze pro Land/Bundesland (siehe
	 * `backend/src/seo/region-flavor.ts`) - Duplicate-Content-Gegenmaßnahme für
	 * Seiten mit wenig/keinen Events. Ergänzt `intro`, ersetzt es nicht.
	 * Leeres Array, wenn kein Country-Kontext vorliegt.
	 */
	regionFlavorParagraphs: string[];
}

/**
 * Basis-Ergebnis des reinen Resolvers (`backend/src/resolver/resolve.ts`, kein
 * DB-Zugriff für Klarnamen). Der `resolver.resolve`-tRPC-Endpunkt reichert dies
 * zusätzlich um `names`/`seo`/`breadcrumbJsonLd` an (siehe `routers/resolver.ts`)
 * - strukturell kompatibel, hier aber bewusst nicht Teil des Basistyps, damit
 * der Resolver selbst ohne DB-Namenslookup testbar bleibt.
 */
export interface NavigationItem {
	slug: string;
	name: string;
	eventCount: number;
}

export interface ResolveResult {
	kind: 'result';
	filters: ResolvedFilters;
	results: EventListItem[];
	total: number;
	/**
	 * true = index,follow. false = noindex,follow.
	 * noindex nur wenn absolut keine Events vorhanden sind (weder zukünftig noch in den letzten 12 Monaten).
	 * Neue SEO-Struktur (Phase 2): Soft-404s für Kombinationen mit 0 Ergebnissen, Archiv-Integration.
	 */
	indexable: boolean;
	futureCount?: number;
	pastCount?: number;
	/**
	 * Gesamtzahl zukünftiger Events (ungedeckelt) - im Gegensatz zu `futureCount`
	 * (Länge der bereits geladenen ersten Seite, siehe `resolve.ts`). Frontend
	 * zeigt den "Mehr laden"-Button, solange `totalFutureCount` größer ist als
	 * die Anzahl bereits geladener zukünftiger Events.
	 */
	totalFutureCount?: number;
	/** Social-Media Preview-Bild für diese Filter-Kombination (optional, falls OG-Image generiert wurde) */
	ogImageUrl?: string;
	/** Navigation tree: available sub-categories with event counts */
	navigationTree?: {
		bundeslaender?: NavigationItem[];
		kreise?: NavigationItem[];
		partyArten?: NavigationItem[];
	};
}

export interface ResolveNotFound {
	kind: 'not-found';
}

export type ResolveOutcome = ResolveRedirect | ResolveResult | ResolveNotFound;
