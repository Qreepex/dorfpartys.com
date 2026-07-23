import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/require-auth.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireAdmin(locals.trpc, url.pathname);
	const [ghostAccountPairs, eventPairs] = await Promise.all([
		locals.trpc.duplicates.ghostAccounts.query(),
		locals.trpc.duplicates.events.query()
	]);
	return { ghostAccountPairs, eventPairs };
};

export const actions: Actions = {
	deleteGhost: async ({ request, locals, url }) => {
		await requireAdmin(locals.trpc, url.pathname);
		const formData = await request.formData();
		const ghostUserId = String(formData.get('ghostUserId') ?? '');
		if (!ghostUserId) {
			return fail(400, { action: 'deleteGhost' as const, error: 'Ghost-Account fehlt' });
		}
		try {
			await locals.trpc.ghostAccounts.delete.mutate({ ghostUserId });
		} catch (err) {
			return fail(400, {
				action: 'deleteGhost' as const,
				error: err instanceof Error ? err.message : 'Ghost-Account konnte nicht gelöscht werden'
			});
		}
		return { action: 'deleteGhost' as const, success: true };
	},

	deleteEvent: async ({ request, locals, url }) => {
		await requireAdmin(locals.trpc, url.pathname);
		const formData = await request.formData();
		const eventId = String(formData.get('eventId') ?? '');
		if (!eventId) {
			return fail(400, { action: 'deleteEvent' as const, error: 'Veranstaltung fehlt' });
		}
		try {
			await locals.trpc.events.delete.mutate({ id: eventId });
		} catch (err) {
			return fail(400, {
				action: 'deleteEvent' as const,
				error: err instanceof Error ? err.message : 'Veranstaltung konnte nicht gelöscht werden'
			});
		}
		return { action: 'deleteEvent' as const, success: true };
	}
};
