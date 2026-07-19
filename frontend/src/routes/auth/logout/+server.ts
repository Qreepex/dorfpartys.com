import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ cookies }) => {
	cookies.delete('dp_session', { path: '/' });
	redirect(302, '/');
};
