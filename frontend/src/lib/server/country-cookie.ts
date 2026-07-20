import type { Cookies } from '@sveltejs/kit';
import type { Country } from '@dorfpartys/shared';

const COUNTRY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Setzt die Land-Präferenz-Cookies (AGENTS.md 5b) an einer zentralen Stelle -
 * genutzt sowohl von der Legacy-Redirect-Route `/land/{country}` als auch vom
 * Land-Toggle auf der Landing Page (`frontend/src/routes/+page.server.ts`,
 * `?land=`-Query-Parameter), damit die Cookie-Logik nicht doppelt gepflegt wird.
 */
export function setCountryCookies(cookies: Cookies, country: Country): void {
	cookies.set('country', country, {
		path: '/',
		maxAge: COUNTRY_COOKIE_MAX_AGE,
		sameSite: 'lax',
		httpOnly: false
	});
	// Merkt sich, dass die Wahl explizit getroffen wurde - die automatische
	// Zeitzonen-Verfeinerung (Navbar.svelte onMount) überschreibt das nicht mehr.
	cookies.set('country_explicit', '1', {
		path: '/',
		maxAge: COUNTRY_COOKIE_MAX_AGE,
		sameSite: 'lax',
		httpOnly: false
	});
}
