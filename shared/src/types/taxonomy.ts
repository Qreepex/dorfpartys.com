import type { Country } from '../constants/index.js';

export interface Bundesland {
	id: string;
	slug: string;
	name: string;
	country: Country;
}

export interface Kreis {
	id: string;
	slug: string;
	name: string;
	bundeslandId: string;
}

export interface PartyArt {
	id: string;
	slug: string;
	name: string;
	active: boolean;
}
