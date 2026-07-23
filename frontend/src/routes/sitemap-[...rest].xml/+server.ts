import { COUNTRIES, SITE_URL, buildEventUrl, type Country } from '@dorfpartys/shared';
import { error } from '@sveltejs/kit';
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

// Statische, nicht datenbankgestützte Seiten (AGENTS.md item 3) - jede
// Detailseite ist außerdem in einer der anderen Sitemaps enthalten.
const STATIC_PAGES = [
	'/',
	...COUNTRIES.map((country) => `/${country}`),
	'/impressum',
	'/datenschutz',
	'/nutzungsbedingungen',
	'/faq',
	'/veranstaltung-eintragen',
	'/suche'
];

/**
 * Bedient sitemap-pages.xml, sitemap-events.xml, sitemap-veranstalter.xml,
 * sitemap-{country}-orte.xml, sitemap-{country}-arten.xml,
 * sitemap-{country}-filter-combinations-level2.xml und
 * sitemap-{country}-{bundesland}-level3.xml (AGENTS.md 1.8).
 * Single-Filter-URLs (BL only, Art only) liefern ausschließlich orte.xml/
 * arten.xml aus - eine eigene level1-Sitemap gab es früher, war aber
 * deckungsgleich damit und wurde entfernt.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const rest = params.rest;

	if (rest === 'pages') {
		return new Response(urlsetXml(STATIC_PAGES.map((loc) => ({ loc }))), {
			headers: { 'Content-Type': 'application/xml' }
		});
	}

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

	if (rest === 'veranstalter') {
		const entries = await locals.trpc.sitemap.veranstalter.query();
		return new Response(urlsetXml(entries.map((e) => ({ loc: e.loc, lastmod: e.updatedAt }))), {
			headers: { 'Content-Type': 'application/xml' }
		});
	}

	// Pattern: {country}-{bundesland}-level3 (z.B. de-schleswig-holstein-level3)
	// Three-filter combinations split by Bundesland to stay under 50k URLs per sitemap
	const blMatch = /^(de|at|ch)-(.+)-level3$/.exec(rest);
	if (blMatch) {
		const [, countrySegment, bundeslandSlug] = blMatch;
		if (!isCountry(countrySegment)) {
			error(404);
		}
		const entries = await locals.trpc.sitemap.filterCombinationsLevel3.query({
			country: countrySegment,
			bundeslandSlug
		});
		return new Response(urlsetXml(entries), { headers: { 'Content-Type': 'application/xml' } });
	}

	// Two-filter combinations at country level
	const match = /^(de|at|ch)-(orte|arten|filter-combinations-level2)$/.exec(rest);
	if (!match) {
		error(404);
	}
	const [, countrySegment, kind] = match;
	if (!isCountry(countrySegment)) {
		error(404);
	}

	if (kind === 'orte') {
		const entries = await locals.trpc.sitemap.orte.query({ country: countrySegment });
		return new Response(urlsetXml(entries), { headers: { 'Content-Type': 'application/xml' } });
	}

	if (kind === 'arten') {
		const entries = await locals.trpc.sitemap.arten.query({ country: countrySegment });
		return new Response(urlsetXml(entries), { headers: { 'Content-Type': 'application/xml' } });
	}

	if (kind === 'filter-combinations-level2') {
		const entries = await locals.trpc.sitemap.filterCombinationsLevel2.query({
			country: countrySegment
		});
		return new Response(urlsetXml(entries), { headers: { 'Content-Type': 'application/xml' } });
	}

	error(404);
};
