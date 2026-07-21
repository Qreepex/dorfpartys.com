import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

// Reine Action-Route für die Navbar-Glocke (analog zu /auth/logout, siehe
// AGENTS.md 5c) - kein direkter Seitenaufruf vorgesehen, daher redirect() im
// Load. `markRead`/`markAllRead` werden von Navbar.svelte per fetch()
// angesprochen (siehe $lib/utils/form-action.ts), nicht über einen echten
// Formular-Submit dieser Seite.
export const load: PageServerLoad = async () => {
	redirect(302, '/');
};

export const actions: Actions = {
	markRead: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');
		if (!id) {
			return fail(400, { error: 'Unbekannte Benachrichtigung' });
		}

		try {
			await locals.trpc.notifications.markRead.mutate({ id });
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : 'Aktion fehlgeschlagen'
			});
		}

		return { markedRead: true };
	},

	markAllRead: async ({ locals }) => {
		try {
			await locals.trpc.notifications.markAllRead.mutate();
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : 'Aktion fehlgeschlagen'
			});
		}

		return { markedAllRead: true };
	}
};
