import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

// Kanonische URLs enden immer mit "/" (AGENTS.md 1.2/1.4/1.7).
export const trailingSlash = 'always';

export const load: PageServerLoad = async ({ params, locals }) => {
	const result = await locals.trpc.users.getProfileBySlug.query({ slug: params.slug });
	if (!result) {
		error(404, 'Veranstalter nicht gefunden');
	}
	return result;
};
