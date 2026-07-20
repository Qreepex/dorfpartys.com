import { requireUser } from '$lib/server/require-auth.js';
import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireUser(locals.trpc, url.pathname);
	const [{ upcoming, past }, myEvents] = await Promise.all([
		locals.trpc.savedEvents.listMine.query(),
		locals.trpc.events.listMine.query()
	]);
	return { upcoming, past, myEvents };
};

export const actions: Actions = {
	unsave: async ({ request, locals }) => {
		const formData = await request.formData();
		const eventId = String(formData.get('eventId') ?? '');
		if (eventId) {
			await locals.trpc.savedEvents.unsave.mutate({ eventId });
		}
		return { success: true };
	},

	delete: async ({ request, locals, url }) => {
		const formData = await request.formData();
		const eventId = String(formData.get('eventId') ?? '');
		if (eventId) {
			try {
				await locals.trpc.events.delete.mutate({ id: eventId });
			} catch (err: any) {
				if (err?.code === 'BAD_REQUEST') {
					return { error: err.message };
				}
				throw error(500, 'Event konnte nicht gelöscht werden');
			}
		}
		return { success: true };
	},

	edit: async ({ request, locals, url }) => {
		const formData = await request.formData();
		const eventId = String(formData.get('eventId') ?? '');
		if (eventId) {
			redirect(302, `/veranstaltung-eintragen?id=${eventId}`);
		}
	}
};
