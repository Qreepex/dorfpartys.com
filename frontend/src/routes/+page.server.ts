import { COUNTRIES } from '@dorfpartys/shared';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, url, parent }) => {
	const { country } = await parent();
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

	return { stats, upcoming, partyArten, bundeslaenderByCountry, country, showAllCountries };
};
