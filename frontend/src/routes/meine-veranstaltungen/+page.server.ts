import { requireUser } from '$lib/server/require-auth.js';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

// Persönliche Übersicht aller selbst eingereichten Veranstaltungen (Navbar-
// User-Card -> "Veranstaltungen"), geschützt analog /profil und /partyliste.
export const load: PageServerLoad = async ({ locals, url }) => {
	await requireUser(locals.trpc, url.pathname);
	const events = await locals.trpc.events.listMine.query();
	return { events };
};

export const actions: Actions = {
	// Analog zur bestehenden `delete`-Action in /partyliste - ruft dieselbe
	// events.delete-Mutation auf (backend/src/routers/events.ts), die
	// unabhängig vom Status löschen lässt, solange die Eigentums-Prüfung passt.
	delete: async ({ request, locals }) => {
		const formData = await request.formData();
		const eventId = String(formData.get('eventId') ?? '');
		if (eventId) {
			try {
				await locals.trpc.events.delete.mutate({ id: eventId });
			} catch (err: any) {
				if (err?.code === 'BAD_REQUEST' || err?.code === 'FORBIDDEN') {
					return { error: err.message ?? 'Event konnte nicht gelöscht werden' };
				}
				throw error(500, 'Event konnte nicht gelöscht werden');
			}
		}
		return { success: true };
	}
};
