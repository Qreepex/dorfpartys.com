import { exchangeCodeForTokens } from '$lib/server/oidc.js';
import { createBackendClient } from '$lib/trpc-client/index.js';
import { error, redirect } from '@sveltejs/kit';
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
	// verifiziert (AGENTS.md Abschnitt 5) - kein Session-Store nötig. Der
	// ID-Token (nicht der Access-Token) wird gespeichert, weil die
	// angefragten Scopes (email/profile/groups) die entsprechenden Claims
	// laut OIDC-Spezifikation in den ID-Token schreiben, nicht in den
	// Access-Token - backend/src/auth/verify.ts erwartet email/groups direkt
	// im verifizierten Token.
	cookies.set('dp_session', tokens.id_token, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: tokens.expires_in
	});

	// Registrierungs-Flow (AGENTS.md Abschnitt 5): neue bzw. noch nicht
	// eingerichtete Nutzer:innen durchlaufen erst das Onboarding-Formular,
	// bevor sie zur ursprünglich angefragten Seite weitergeleitet werden.
	// hooks.server.ts hat für diesen Request noch das alte (fehlende) Cookie
	// gesehen, daher hier ein eigener Client mit dem frischen Token.
	const trpc = createBackendClient(`dp_session=${tokens.id_token}`);
	let onboardingCompleted = true;
	try {
		const me = await trpc.users.me.query();
		onboardingCompleted = Boolean(me.onboardingCompletedAt);
	} catch {
		// Verifizierung schlägt hier nur bei einem kaputten Token fehl - dann
		// einfach normal weiterleiten, statt den Login-Flow abzubrechen.
	}

	if (!onboardingCompleted) {
		redirect(302, `/willkommen?redirectTo=${encodeURIComponent(redirectTo)}`);
	}
	redirect(302, redirectTo);
};
