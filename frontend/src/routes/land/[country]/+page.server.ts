import { COUNTRIES, type Country } from '@dorfpartys/shared';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

const COUNTRY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function isCountry(value: string): value is Country {
	return (COUNTRIES as readonly string[]).includes(value);
}

/**
 * Explizites Land-Wechseln (AGENTS.md item 3) - als `+page.server.ts`-Load statt
 * `+server.ts` implementiert, aus demselben Grund wie `auth/login`/`auth/logout`:
 * sonst behandelt SvelteKits clientseitiger Router einen Klick auf den
 * Land-Switcher fälschlich als 404 (kein `+page.svelte` = keine Client-Route).
 */
export const load: PageServerLoad = async ({ params, url, cookies }) => {
	if (!isCountry(params.country)) {
		error(404);
	}

	cookies.set('country', params.country, {
		path: '/',
		maxAge: COUNTRY_COOKIE_MAX_AGE,
		sameSite: 'lax',
		httpOnly: false
	});
	// Merkt sich, dass die Wahl explizit getroffen wurde - die automatische
	// Zeitzonen-Verfeinerung (Navbar.svelte) überschreibt das nicht mehr.
	cookies.set('country_explicit', '1', {
		path: '/',
		maxAge: COUNTRY_COOKIE_MAX_AGE,
		sameSite: 'lax',
		httpOnly: false
	});

	const to = url.searchParams.get('to');
	redirect(302, to && to.startsWith('/') ? to : '/');
};
