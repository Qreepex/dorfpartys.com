import { error } from '@sveltejs/kit';
import { COUNTRIES, SITE_URL, buildEventUrl, type Country } from '@dorfpartys/shared';
import type { RequestHandler } from './$types.js';

function isCountry(value: string): value is Country {
	return (COUNTRIES as readonly string[]).includes(value);
}

function urlsetXml(entries: Array<{ loc: string; lastmod?: string }>): string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
	.map(
		(e) =>
			`  <url><loc>${SITE_URL}${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`
	)
	.join('\n')}
</urlset>
`;
}

/**
 * Bedient sitemap-events.xml, sitemap-{country}-orte.xml und
 * sitemap-{country}-arten.xml (AGENTS.md 1.8). Nur URLs mit Content —
 * die Datenaufbereitung (nur Kombinationen mit Events) passiert im Backend.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const rest = params.rest;

	if (rest === 'events') {
		const entries = await locals.trpc.sitemap.events.query();
		const body = urlsetXml(
			entries.map((e) => ({
				loc: buildEventUrl(e.country as Country, e.slug),
				lastmod: e.updatedAt
			}))
		);
		return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
	}

	const match = /^(de|at|ch)-(orte|arten)$/.exec(rest);
	if (!match) {
		error(404);
	}
	const [, countrySegment, kind] = match;
	if (!isCountry(countrySegment)) {
		error(404);
	}

	const entries =
		kind === 'orte'
			? await locals.trpc.sitemap.orte.query({ country: countrySegment })
			: await locals.trpc.sitemap.arten.query({ country: countrySegment });

	return new Response(urlsetXml(entries), { headers: { 'Content-Type': 'application/xml' } });
};
