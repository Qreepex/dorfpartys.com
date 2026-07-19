import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

// Alte URL, dauerhaft umgezogen nach /veranstaltung-eintragen - als Load statt
// `+server.ts`, siehe Begründung in auth/login/+page.server.ts.
export const load: PageServerLoad = async () => {
	redirect(301, '/veranstaltung-eintragen');
};
