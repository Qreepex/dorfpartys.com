import type { PageServerLoad } from './$types.js';

// Volle Ergebnisseite für die Freitextsuche (Navbar-Lupe + Hero-Suchfeld,
// AGENTS.md-Ergänzung "Freitextsuche") - im Gegensatz zum Autocomplete-Dropdown
// (frontend/src/routes/search/+server.ts, `search.global`) hier großzügiger,
// aber weiterhin über `search.full` (backend/src/routers/search.ts) hart auf
// 100 Events / 20 Veranstalter gedeckelt, damit generische Suchbegriffe die DB
// nicht mit unbegrenzten ILIKE-Treffern belasten.
export const load: PageServerLoad = async ({ locals, url }) => {
	const query = (url.searchParams.get('q')?.trim() ?? '').slice(0, 100);

	if (query.length < 1) {
		return { query, events: [], organizers: [], locations: [] };
	}

	const { events, organizers, locations } = await locals.trpc.search.full.query({ query });
	return { query, events, organizers, locations };
};
