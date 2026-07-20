import { setCountryCookies } from '$lib/server/country-cookie.js';
import { COUNTRIES, type Country } from '@dorfpartys/shared';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

function isCountry(value: string): value is Country {
	return (COUNTRIES as readonly string[]).includes(value);
}

/**
 * Legacy explizites Land-Wechseln (AGENTS.md item 3) - als `+page.server.ts`-Load
 * statt `+server.ts` implementiert, aus demselben Grund wie `auth/login`/`auth/logout`:
 * sonst behandelt SvelteKits clientseitiger Router einen Klick auf den
 * Land-Switcher fälschlich als 404 (kein `+page.svelte` = keine Client-Route).
 *
 * Der Land-Toggle in der Navbar wurde entfernt (er hatte im Such-Baum keine
 * Wirkung, siehe Landing-Page-Toggle stattdessen). Diese Route bleibt als
 * generischer Redirect-Endpunkt bestehen, falls andere Stellen im Code noch
 * direkt darauf verlinken wollen; aktuell verlinkt nichts mehr hierher.
 */
export const load: PageServerLoad = async ({ params, url, cookies }) => {
	if (!isCountry(params.country)) {
		error(404);
	}

	setCountryCookies(cookies, params.country);

	const to = url.searchParams.get('to');
	redirect(302, to && to.startsWith('/') ? to : '/');
};
