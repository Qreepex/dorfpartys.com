import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

// Live-Suche für die Navbar-Lupe: durchsucht Events und Veranstalter parallel
// (backend/src/routers/search.ts, `global`).
export const GET: RequestHandler = async ({ url, locals }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';
	if (query.length < 1) {
		return json({ events: [], organizers: [], locations: [] });
	}

	const results = await locals.trpc.search.global.query({ query });
	return json(results);
};
