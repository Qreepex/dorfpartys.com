import type { Country } from '../constants/index.js';
import type { EventListItem } from './event.js';

export interface ResolvedFilters {
	country: Country;
	bundeslandSlug: string | null;
	kreisSlug: string | null;
	artSlug: string | null;
	monatSlug: string | null;
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
	monatName: string | null;
}

/** Pro Segment-Kombination eindeutiger SEO-Text, serverseitig aus den Klarnamen gebaut. */
export interface ResolvedSeoCopy {
	title: string;
	description: string;
	h1: string;
	intro: string;
}

/**
 * Basis-Ergebnis des reinen Resolvers (`backend/src/resolver/resolve.ts`, kein
 * DB-Zugriff für Klarnamen). Der `resolver.resolve`-tRPC-Endpunkt reichert dies
 * zusätzlich um `names`/`seo`/`breadcrumbJsonLd` an (siehe `routers/resolver.ts`)
 * — strukturell kompatibel, hier aber bewusst nicht Teil des Basistyps, damit
 * der Resolver selbst ohne DB-Namenslookup testbar bleibt.
 */
export interface ResolveResult {
	kind: 'result';
	filters: ResolvedFilters;
	results: EventListItem[];
	total: number;
	/**
	 * index,follow für jede gültige Segment-Kombination, auch ohne aktuelle
	 * Treffer — bewusste Abweichung von AGENTS.md 1.6: leere, aber valide
	 * Such-URLs sollen bereits jetzt Ranking aufbauen, damit künftig
	 * eingetragene Events sofort sichtbar sind (siehe TODO.md).
	 */
	indexable: boolean;
}

export interface ResolveNotFound {
	kind: 'not-found';
}

export type ResolveOutcome = ResolveRedirect | ResolveResult | ResolveNotFound;
