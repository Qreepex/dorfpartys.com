import { requireModerator } from '$lib/server/require-auth.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireModerator(locals.trpc, url.pathname);
	const reports = await locals.trpc.reports.list.query();
	return { reports };
};
