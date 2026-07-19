import { COUNTRIES } from '@dorfpartys/shared';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals }) => {
	const [stats, upcoming, partyArten, bundeslaenderByCountry] = await Promise.all([
		locals.trpc.stats.overview.query(),
		locals.trpc.events.listUpcoming.query({ limit: 6 }),
		locals.trpc.taxonomy.partyArten.query(),
		Promise.all(
			COUNTRIES.map(async (country) => ({
				country,
				bundeslaender: await locals.trpc.taxonomy.bundeslaender.query({ country })
			}))
		)
	]);

	return { stats, upcoming, partyArten, bundeslaenderByCountry };
};
