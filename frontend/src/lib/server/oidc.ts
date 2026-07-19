import { env } from '$env/dynamic/private';

interface OidcDiscoveryDocument {
	authorization_endpoint: string;
	token_endpoint: string;
}

let cachedDiscovery: OidcDiscoveryDocument | undefined;

function requiredEnv(name: string): string {
	const value = (env as Record<string, string | undefined>)[name];
	if (!value) throw new Error(`${name} ist nicht gesetzt`);
	return value;
}

async function getDiscoveryDocument(): Promise<OidcDiscoveryDocument> {
	if (cachedDiscovery) return cachedDiscovery;
	const issuer = requiredEnv('AUTHENTIK_ISSUER');
	const res = await fetch(`${issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`);
	if (!res.ok) {
		throw new Error(`OIDC-Discovery gegen Authentik fehlgeschlagen (${res.status})`);
	}
	cachedDiscovery = (await res.json()) as OidcDiscoveryDocument;
	return cachedDiscovery;
}

export async function buildAuthorizationUrl(state: string, codeChallenge: string): Promise<string> {
	const discovery = await getDiscoveryDocument();
	const url = new URL(discovery.authorization_endpoint);
	url.searchParams.set('client_id', requiredEnv('AUTHENTIK_CLIENT_ID'));
	url.searchParams.set('redirect_uri', requiredEnv('AUTHENTIK_REDIRECT_URI'));
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('scope', 'openid email profile groups');
	url.searchParams.set('state', state);
	url.searchParams.set('code_challenge', codeChallenge);
	url.searchParams.set('code_challenge_method', 'S256');
	return url.toString();
}

export interface TokenResponse {
	access_token: string;
	id_token?: string;
	refresh_token?: string;
	expires_in: number;
}

export async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse> {
	const discovery = await getDiscoveryDocument();
	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		code,
		redirect_uri: requiredEnv('AUTHENTIK_REDIRECT_URI'),
		client_id: requiredEnv('AUTHENTIK_CLIENT_ID'),
		client_secret: requiredEnv('AUTHENTIK_CLIENT_SECRET'),
		code_verifier: codeVerifier
	});

	const res = await fetch(discovery.token_endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body
	});
	if (!res.ok) {
		throw new Error(`Token-Austausch mit Authentik fehlgeschlagen (${res.status})`);
	}
	return res.json() as Promise<TokenResponse>;
}
