import { requireUser } from '$lib/server/require-auth.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireUser(locals.trpc, url.pathname);
	const { upcoming, past } = await locals.trpc.savedEvents.listMine.query();
	return { upcoming, past };
};

export const actions: Actions = {
	unsave: async ({ request, locals }) => {
		const formData = await request.formData();
		const eventId = String(formData.get('eventId') ?? '');
		if (eventId) {
			await locals.trpc.savedEvents.unsave.mutate({ eventId });
		}
		return { success: true };
	}
};
