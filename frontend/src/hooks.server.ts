import type { Handle } from '@sveltejs/kit';
import { detectCountryFromAcceptLanguage } from '$lib/server/detect-country.js';
import { createBackendClient } from '$lib/trpc-client/index.js';

const COUNTRY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const handle: Handle = async ({ event, resolve }) => {
	// getClientAddress() liefert die echte Browser-IP nur korrekt, wenn der
	// Node-Adapter per ADDRESS_HEADER/XFF_DEPTH auf den von ingress-nginx
	// gesetzten x-forwarded-for-Header vertraut (infra/k8s/frontend/configmap.yaml) -
	// wird ans Backend fürs IP-basierte Ratelimiting durchgereicht
	// (backend/src/rate-limit/index.ts).
	let clientIp: string | null = null;
	try {
		clientIp = event.getClientAddress();
	} catch {
		// z.B. bei lokalen/synthetischen Requests ohne Socket-Adresse
	}
	event.locals.trpc = createBackendClient(event.request.headers.get('cookie'), clientIp);

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
