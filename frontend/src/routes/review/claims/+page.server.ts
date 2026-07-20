import { requireModerator } from '$lib/server/require-auth.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireModerator(locals.trpc, url.pathname);
	const claims = await locals.trpc.eventClaims.listPending.query();
	return { claims };
};

export const actions: Actions = {
	approve: async ({ request, locals, url }) => {
		await requireModerator(locals.trpc, url.pathname);
		const formData = await request.formData();
		const id = String(formData.get('id'));
		await locals.trpc.eventClaims.approve.mutate({ id });
		return { success: true, action: 'approve' };
	},

	reject: async ({ request, locals, url }) => {
		await requireModerator(locals.trpc, url.pathname);
		const formData = await request.formData();
		const id = String(formData.get('id'));
		await locals.trpc.eventClaims.reject.mutate({ id });
		return { success: true, action: 'reject' };
	}
};
