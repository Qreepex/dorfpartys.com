import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

// Als Load statt `+server.ts` - siehe Begründung in `auth/login/+page.server.ts`.
export const load: PageServerLoad = async ({ cookies }) => {
	cookies.delete('dp_session', { path: '/' });
	redirect(302, '/');
};
