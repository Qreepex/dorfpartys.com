import { error, redirect } from '@sveltejs/kit';
import { COUNTRIES, type Country } from '@dorfpartys/shared';
import type { PageServerLoad } from './$types.js';

function isCountry(value: string): value is Country {
	return (COUNTRIES as readonly string[]).includes(value);
}

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!isCountry(params.country)) {
		error(404);
	}

	const segments = params.segments ? params.segments.split('/').filter(Boolean) : [];

	const outcome = await locals.trpc.resolver.resolve.query({
		country: params.country,
		segments
	});

	if (outcome.kind === 'redirect') {
		redirect(301, outcome.location);
	}
	if (outcome.kind === 'not-found') {
		error(404);
	}

	return { outcome };
};
