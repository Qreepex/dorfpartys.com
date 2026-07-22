import { error, json } from '@sveltejs/kit';
import { COUNTRIES, type Country } from '@dorfpartys/shared';
import type { RequestHandler } from './$types.js';

function isCountry(value: string | null): value is Country {
	return !!value && (COUNTRIES as readonly string[]).includes(value);
}

// "Mehr laden"-Nachlade-Endpoint für die Filter-/Suchseiten
// ([country]/[...segments]/+page.svelte) - liegt bewusst außerhalb des
// [...segments]-Baums (AGENTS.md 5c gilt hier nicht direkt, aber ein
// +server.ts unter [...segments] würde mit dessen +page.server.ts kollidieren).
export const GET: RequestHandler = async ({ url, locals }) => {
	const country = url.searchParams.get('country');
	if (!isCountry(country)) {
		error(400, 'invalid country');
	}

	const segmentsParam = url.searchParams.get('segments') ?? '';
	const segments = segmentsParam.split('/').filter(Boolean);

	const offset = Number(url.searchParams.get('offset'));
	if (!Number.isInteger(offset) || offset < 0) {
		error(400, 'invalid offset');
	}

	const { results } = await locals.trpc.resolver.loadMoreEvents.query({
		country,
		segments,
		offset
	});

	return json({ results });
};
