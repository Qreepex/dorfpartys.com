import { error, redirect } from '@sveltejs/kit';
import { exchangeCodeForTokens } from '$lib/server/oidc.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const expectedState = cookies.get('oidc_state');
	const codeVerifier = cookies.get('oidc_code_verifier');
	const redirectTo = cookies.get('oidc_redirect_to') ?? '/';

	cookies.delete('oidc_state', { path: '/' });
	cookies.delete('oidc_code_verifier', { path: '/' });
	cookies.delete('oidc_redirect_to', { path: '/' });

	if (!code || !state || !expectedState || state !== expectedState || !codeVerifier) {
		error(400, 'Ungültiger Login-Callback');
	}

	const tokens = await exchangeCodeForTokens(code, codeVerifier);

	// dp_session wird vom Backend zustandslos gegen die Authentik-JWKS
	// verifiziert (AGENTS.md Abschnitt 5) — kein Session-Store nötig.
	cookies.set('dp_session', tokens.access_token, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: tokens.expires_in
	});

	redirect(302, redirectTo);
};
