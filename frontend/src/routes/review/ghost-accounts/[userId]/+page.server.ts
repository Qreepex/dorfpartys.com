import { error, fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/require-auth.js';
import { updateGhostAccountInputSchema } from '@dorfpartys/shared';
import { TRPCClientError } from '@trpc/client';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, url, params }) => {
	await requireAdmin(locals.trpc, url.pathname);
	try {
		const { ghost, events } = await locals.trpc.ghostAccounts.listEventsForGhost.query({
			ghostUserId: params.userId
		});
		return { ghost, events };
	} catch (err) {
		const code =
			err instanceof TRPCClientError ? (err.data as { code?: string } | null)?.code : undefined;
		if (code === 'BAD_REQUEST') {
			error(404, 'Kein Ghost-Account');
		}
		throw err;
	}
};

export const actions: Actions = {
	rename: async ({ request, locals, url, params }) => {
		await requireAdmin(locals.trpc, url.pathname);
		const formData = await request.formData();
		const parsed = updateGhostAccountInputSchema.safeParse({
			ghostUserId: params.userId,
			displayName: formData.get('displayName')
		});
		if (!parsed.success) {
			return fail(400, {
				action: 'rename' as const,
				fieldErrors: parsed.error.flatten().fieldErrors
			});
		}

		try {
			await locals.trpc.ghostAccounts.update.mutate(parsed.data);
		} catch (err) {
			return fail(400, {
				action: 'rename' as const,
				error: err instanceof Error ? err.message : 'Umbenennen fehlgeschlagen'
			});
		}
		return { action: 'rename' as const, success: true };
	},
	delete: async ({ request, locals, url }) => {
		await requireAdmin(locals.trpc, url.pathname);
		const formData = await request.formData();
		const eventId = String(formData.get('eventId') ?? '');
		if (!eventId) {
			return fail(400, { action: 'delete' as const, error: 'Event fehlt' });
		}
		try {
			await locals.trpc.events.delete.mutate({ id: eventId });
		} catch (err) {
			return fail(400, {
				action: 'delete' as const,
				error: err instanceof Error ? err.message : 'Event konnte nicht gelöscht werden'
			});
		}
		return { action: 'delete' as const, success: true };
	}
};
