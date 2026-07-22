import { COUNTRIES, SITE_URL } from '@dorfpartys/shared';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ locals }) => {
	// Base sitemaps (static + country-level)
	const staticFiles = [
		'sitemap-pages.xml',
		'sitemap-events.xml',
		'sitemap-veranstalter.xml',
		...COUNTRIES.flatMap((country) => [
			`sitemap-${country}-orte.xml`,
			`sitemap-${country}-arten.xml`,
			`sitemap-${country}-filter-combinations-level2.xml`
		])
	];

	// Dynamically add Bundesland-Level3 sitemaps (BL+Kreis+Art combinations per Bundesland)
	const bundeslandFiles: string[] = [];
	for (const country of COUNTRIES) {
		const slugs = await locals.trpc.sitemap.bundeslandSlugsForSitemapIndex.query({ country });
		for (const slug of slugs) {
			bundeslandFiles.push(`sitemap-${country}-${slug}-level3.xml`);
		}
	}

	const allFiles = [...staticFiles, ...bundeslandFiles];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allFiles.map((file) => `  <sitemap><loc>${SITE_URL}/${file}</loc></sitemap>`).join('\n')}
</sitemapindex>
`;

	return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
