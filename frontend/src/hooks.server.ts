import type { Handle } from '@sveltejs/kit';
import { detectCountryFromAcceptLanguage } from '$lib/server/detect-country.js';
import { createBackendClient } from '$lib/trpc-client/index.js';

const COUNTRY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const handle: Handle = async ({ event, resolve }) => {
	// Die Domain läuft hinter Cloudflare (Proxy-Modus) - Cloudflare setzt
	// `cf-connecting-ip` am Edge immer auf die echte Besucher-IP, unabhängig
	// davon, wie viele Hops zwischen Cloudflare und diesem Pod liegen. Das ist
	// robuster als getClientAddress()/x-forwarded-for-Depth-Zählung (die nur
	// den einen ingress-nginx-Hop annimmt und dadurch bei Requests über
	// Cloudflare die interne Ingress-/LB-IP statt der Browser-IP lieferte).
	// Fällt auf getClientAddress() zurück für Requests ohne Cloudflare davor
	// (z.B. lokale Entwicklung, direkter Cluster-Zugriff).
	//
	// Wichtig: Damit dieser Header nicht spoofbar ist, muss der Origin (bzw.
	// ingress-nginx/Firewall) so konfiguriert sein, dass er nur Traffic aus
	// den Cloudflare-IP-Ranges annimmt - sonst kann jeder, der den Origin
	// direkt anspricht, `cf-connecting-ip` frei setzen und damit das
	// IP-basierte Ratelimiting (backend/src/rate-limit/index.ts) umgehen.
	let clientIp: string | null = event.request.headers.get('cf-connecting-ip');
	if (!clientIp) {
		try {
			clientIp = event.getClientAddress();
		} catch {
			// z.B. bei lokalen/synthetischen Requests ohne Socket-Adresse
		}
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
