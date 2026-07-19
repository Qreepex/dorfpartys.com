import { COUNTRIES, SITE_URL } from '@dorfpartys/shared';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async () => {
	const files = [
		'sitemap-events.xml',
		...COUNTRIES.flatMap((country) => [`sitemap-${country}-orte.xml`, `sitemap-${country}-arten.xml`])
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${files.map((file) => `  <sitemap><loc>${SITE_URL}/${file}</loc></sitemap>`).join('\n')}
</sitemapindex>
`;

	return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
