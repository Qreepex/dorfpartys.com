import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

// Live-Nachlade-Endpoint für /suche - liefert dieselben (großzügiger
// gedeckelten) Ergebnisse wie der initiale SSR-Load (`search.full`,
// backend/src/routers/search.ts), aber für die client-seitige Debounce-Suche
// beim Tippen auf der Ergebnisseite selbst (analog zur Navbar-Lupe, die
// `/search` gegen `search.global` nutzt).
export const GET: RequestHandler = async ({ url, locals }) => {
	const query = url.searchParams.get('q')?.trim().slice(0, 100) ?? '';
	if (query.length < 1) {
		return json({ events: [], organizers: [], locations: [] });
	}

	const results = await locals.trpc.search.full.query({ query });
	return json(results);
};
