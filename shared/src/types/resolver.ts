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

export interface ResolveResult {
	kind: 'result';
	filters: ResolvedFilters;
	results: EventListItem[];
	total: number;
	/** index,follow nur wenn total > 0 (AGENTS.md 1.6) */
	indexable: boolean;
}

export interface ResolveNotFound {
	kind: 'not-found';
}

export type ResolveOutcome = ResolveRedirect | ResolveResult | ResolveNotFound;
