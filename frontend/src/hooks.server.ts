import type { Handle } from '@sveltejs/kit';
import { detectCountryFromAcceptLanguage } from '$lib/server/detect-country.js';
import { createBackendClient } from '$lib/trpc-client/index.js';

const COUNTRY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.trpc = createBackendClient(event.request.headers.get('cookie'));

	// Land-Erkennung (AGENTS.md item 3): einmalig aus Accept-Language, bewusst
	// ohne externen IP-Geolocation-Dienst (Privacy-Positionierung der Seite).
	// Clientseitig per Zeitzone verfeinert, siehe Navbar.svelte.
	if (!event.cookies.get('country')) {
		const detected = detectCountryFromAcceptLanguage(event.request.headers.get('accept-language'));
		event.cookies.set('country', detected, {
			path: '/',
			maxAge: COUNTRY_COOKIE_MAX_AGE,
			sameSite: 'lax',
			httpOnly: false
		});
	}

	return resolve(event);
};
