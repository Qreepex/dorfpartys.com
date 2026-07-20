import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

// Live-Suche für die Veranstalter-Auswahl im Einreichungsformular (AGENTS.md
// 5.3) - liefert öffentliche Profile (echt oder Ghost-Accounts).
export const GET: RequestHandler = async ({ url, locals }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';
	if (query.length < 1) {
		return json({ results: [] });
	}

	const results = await locals.trpc.users.searchOrganizers.query({ query });
	return json({ results });
};
