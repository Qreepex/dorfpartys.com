import { requireModerator } from '$lib/server/require-auth.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireModerator(locals.trpc, url.pathname);
	const nominations = await locals.trpc.organizerNominations.listPending.query();
	return { nominations };
};

export const actions: Actions = {
	confirm: async ({ request, locals, url }) => {
		await requireModerator(locals.trpc, url.pathname);
		const formData = await request.formData();
		const id = String(formData.get('id'));
		await locals.trpc.organizerNominations.confirm.mutate({ id });
		return { success: true, action: 'confirm' };
	},

	reject: async ({ request, locals, url }) => {
		await requireModerator(locals.trpc, url.pathname);
		const formData = await request.formData();
		const id = String(formData.get('id'));
		await locals.trpc.organizerNominations.reject.mutate({ id });
		return { success: true, action: 'reject' };
	}
};
