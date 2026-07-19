import { fail } from '@sveltejs/kit';
import { requireModerator } from '$lib/server/require-auth.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireModerator(locals.trpc, url.pathname);
	const events = await locals.trpc.events.listInReview.query();
	return { events };
};

export const actions: Actions = {
	approve: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = String(formData.get('id'));
		try {
			await locals.trpc.events.review.mutate({ id, decision: 'approved' });
		} catch (err) {
			return fail(400, { error: err instanceof Error ? err.message : 'Freigabe fehlgeschlagen' });
		}
		return { success: true };
	},

	reject: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = String(formData.get('id'));
		try {
			await locals.trpc.events.review.mutate({ id, decision: 'rejected' });
		} catch (err) {
			return fail(400, { error: err instanceof Error ? err.message : 'Ablehnung fehlgeschlagen' });
		}
		return { success: true };
	}
};
