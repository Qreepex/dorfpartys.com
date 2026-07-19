import type { Country, EventListItem } from '@dorfpartys/shared';

export interface TaxonomyBundesland {
	id: string;
	slug: string;
}

export interface TaxonomyKreis {
	id: string;
	slug: string;
	bundeslandId: string;
	bundeslandSlug: string;
}

export interface TaxonomyPartyArt {
	id: string;
	slug: string;
}

export interface EventFilterIds {
	bundeslandId?: string;
	kreisId?: string;
	partyArtId?: string;
	monatNumber?: number;
}

export interface TaxonomyRepository {
	findBundeslandBySlug(country: Country, slug: string): Promise<TaxonomyBundesland | undefined>;
	findKreisBySlug(country: Country, slug: string): Promise<TaxonomyKreis | undefined>;
	findPartyArtBySlug(slug: string): Promise<TaxonomyPartyArt | undefined>;
	countApprovedEvents(country: Country, filters: EventFilterIds): Promise<number>;
	listApprovedEvents(
		country: Country,
		filters: EventFilterIds,
		limit?: number
	): Promise<EventListItem[]>;
}
