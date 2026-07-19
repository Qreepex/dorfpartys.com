import { writable } from 'svelte/store';
import type { User, Country } from '@dorfpartys/shared';

export const userStore = writable<User | null>(null);
export const countryStore = writable<Country>('de');

export function initializeStores(initialUser: User | null, initialCountry: Country) {
	userStore.set(initialUser);
	countryStore.set(initialCountry);

	// Sync country changes back to cookie
	countryStore.subscribe((country) => {
		if (typeof window !== 'undefined') {
			const COUNTRY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
			document.cookie = `country=${country}; path=/; max-age=${COUNTRY_COOKIE_MAX_AGE}; samesite=lax`;
			document.cookie = `country_explicit=1; path=/; max-age=${COUNTRY_COOKIE_MAX_AGE}; samesite=lax`;
		}
	});
}
