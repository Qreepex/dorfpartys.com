import { buildAuthorizationUrl } from '$lib/server/oidc.js';
import { redirect } from '@sveltejs/kit';
import { createHash, randomBytes } from 'node:crypto';
import type { PageServerLoad } from './$types.js';

function base64url(input: Buffer): string {
	return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const OIDC_COOKIE_MAX_AGE = 600;

/**
 * Als `+page.server.ts`-Load statt `+server.ts` implementiert: `/auth/login`
 * hat sonst keine Client-Route (kein `+page.svelte`), wodurch SvelteKits
 * clientseitiger Router eine Navigation dorthin (Klick auf den Login-Link,
 * oder ein serverseitiger `redirect()` aus `requireUser()`) fälschlich als
 * 404 behandelt, statt auf eine volle Seitennavigation zurückzufallen - das
 * passiert nur bei tatsächlich externen URLs. Als Load-Funktion findet der
 * Router eine passende Route, führt sie serverseitig aus und folgt dem
 * (echten externen) Redirect zu Authentik korrekt.
 */
export const load: PageServerLoad = async ({ cookies, url }) => {
	const state = base64url(randomBytes(16));
	const codeVerifier = base64url(randomBytes(32));
	const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());
	const redirectTo = url.searchParams.get('redirectTo') ?? '/';

	const cookieOptions = {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax' as const,
		maxAge: OIDC_COOKIE_MAX_AGE
	};
	cookies.set('oidc_state', state, cookieOptions);
	cookies.set('oidc_code_verifier', codeVerifier, cookieOptions);
	cookies.set('oidc_redirect_to', redirectTo, cookieOptions);

	const authorizationUrl = await buildAuthorizationUrl(state, codeChallenge);
	redirect(302, authorizationUrl);
};
