import { requireUser } from '$lib/server/require-auth.js';
import type { PageServerLoad } from './$types.js';

// Persönliche Übersicht aller selbst eingereichten Veranstaltungen (Navbar-
// User-Card -> "Veranstaltungen"), geschützt analog /profil und /partyliste.
export const load: PageServerLoad = async ({ locals, url }) => {
	await requireUser(locals.trpc, url.pathname);
	const events = await locals.trpc.events.listMine.query();
	return { events };
};
