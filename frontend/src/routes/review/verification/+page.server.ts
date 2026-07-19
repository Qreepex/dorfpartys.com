import { requireModerator } from '$lib/server/require-auth.js';
import type { PageServerLoad, Actions } from './$types.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireModerator(locals.trpc, url.pathname);
	const requests = await locals.trpc.adminVerification.listPending.query();
	return { requests };
};

export const actions: Actions = {
	approve: async ({ request, locals, url }) => {
		await requireModerator(locals.trpc, url.pathname);

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const method = formData.get('method') as string;

		await locals.trpc.adminVerification.approve.mutate({
			userId,
			method: method as 'email' | 'instagram' | 'tiktok'
		});

		return { success: true, action: 'approve', userId };
	},

	reject: async ({ request, locals, url }) => {
		await requireModerator(locals.trpc, url.pathname);

		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		await locals.trpc.adminVerification.reject.mutate({ userId });

		return { success: true, action: 'reject', userId };
	}
};
