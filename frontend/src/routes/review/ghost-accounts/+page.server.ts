import { fail } from '@sveltejs/kit';
import { createGhostAccountInputSchema } from '@dorfpartys/shared';
import { requireAdmin } from '$lib/server/require-auth.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireAdmin(locals.trpc, url.pathname);
	const ghostAccounts = await locals.trpc.ghostAccounts.list.query();
	return { ghostAccounts };
};

export const actions: Actions = {
	createGhost: async ({ request, locals, url }) => {
		await requireAdmin(locals.trpc, url.pathname);
		const formData = await request.formData();
		const parsed = createGhostAccountInputSchema.safeParse({
			displayName: formData.get('displayName')
		});
		if (!parsed.success) {
			return fail(400, {
				action: 'createGhost' as const,
				fieldErrors: parsed.error.flatten().fieldErrors
			});
		}

		const result = await locals.trpc.ghostAccounts.create.mutate(parsed.data);
		return { action: 'createGhost' as const, success: true, displayName: result.displayName };
	},

	generateCode: async ({ request, locals, url }) => {
		await requireAdmin(locals.trpc, url.pathname);
		const formData = await request.formData();
		const ghostUserId = String(formData.get('ghostUserId') ?? '');
		if (!ghostUserId) {
			return fail(400, { action: 'generateCode' as const, error: 'Ghost-Account fehlt' });
		}

		const result = await locals.trpc.ghostAccounts.generateInviteCode.mutate({ ghostUserId });
		return {
			action: 'generateCode' as const,
			success: true,
			ghostUserId,
			code: result.code
		};
	}
};
