import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async ({ locals }) => {
	try {
		const user = await locals.trpc.users.me.query();
		return { user };
	} catch {
		return { user: null };
	}
};
