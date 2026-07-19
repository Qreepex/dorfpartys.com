import { error } from '@sveltejs/kit';
import { COUNTRIES, type Country } from '@dorfpartys/shared';
import type { PageServerLoad } from './$types.js';

function isCountry(value: string): value is Country {
	return (COUNTRIES as readonly string[]).includes(value);
}

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!isCountry(params.country)) {
		error(404);
	}

	try {
		const event = await locals.trpc.events.getBySlug.query({
			country: params.country,
			slug: params.slug
		});
		return { event };
	} catch {
		error(404, 'Event nicht gefunden');
	}
};
