import { setCountryCookies } from '$lib/server/country-cookie.js';
import { COUNTRIES, type Country } from '@dorfpartys/shared';
import type { PageServerLoad } from './$types.js';

function isCountry(value: string | null): value is Country {
	return !!value && (COUNTRIES as readonly string[]).includes(value);
}

/**
 * Land-Toggle auf der Landing Page (löst den alten Navbar-Toggle ab, siehe
 * Navbar.svelte): `?land=de|at|ch` ist ein echter, eigenständig indexierbarer
 * Query-Parameter statt eines reinen Client-Stores - `url.searchParams` wird
 * von SvelteKit als Load-Dependency getrackt, ein Klick auf den Toggle-Link
 * (echtes `<a href>`) lädt diese `load`-Funktion also zuverlässig clientseitig
 * neu (kein Reload nötig, siehe Kommentar in lib/stores.ts zum alten Bug).
 *
 * Ohne den Parameter bleibt das Verhalten identisch zu vorher: Cookie-/
 * Accept-Language-basierte Schätzung aus dem Root-Layout (AGENTS.md 5b).
 */
export const load: PageServerLoad = async ({ locals, url, parent, cookies }) => {
	const { country: guessedCountry } = await parent();

	const landParam = url.searchParams.get('land');
	const explicitCountry = isCountry(landParam) ? landParam : null;
	const country = explicitCountry ?? guessedCountry;

	if (explicitCountry) {
		// Derselbe Mechanismus wie /land/{country} (item 4) - ein Klick auf den
		// Toggle merkt die Präferenz auch dauerhaft für den Rest der Seite/App.
		setCountryCookies(cookies, explicitCountry);
	}

	// "Alle Länder" (AGENTS.md item 3) - explizites Verlassen des Landesfokus
	// über einen Link, nicht über einen dauerhaften Präferenzwechsel.
	const showAllCountries = url.searchParams.has('alle');

	const [stats, upcoming, partyArten, bundeslaenderByCountry] = await Promise.all([
		locals.trpc.stats.overview.query(),
		locals.trpc.events.listUpcoming.query(showAllCountries ? { limit: 6 } : { limit: 6, country }),
		locals.trpc.taxonomy.partyArten.query(),
		Promise.all(
			COUNTRIES.map(async (c) => ({
				country: c,
				bundeslaender: await locals.trpc.taxonomy.bundeslaender.query({ country: c })
			}))
		)
	]);

	return {
		stats,
		upcoming,
		partyArten,
		bundeslaenderByCountry,
		country,
		explicitCountry,
		showAllCountries
	};
};
