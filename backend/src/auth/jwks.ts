import { createRemoteJWKSet } from 'jose';

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

/** Lazy, gecachter JWKS-Client gegen die Authentik-Instanz (zustandslose Verifizierung). */
export function getAuthentikJwks() {
	if (!jwks) {
		const jwksUrl = process.env.AUTHENTIK_JWKS_URL;
		if (!jwksUrl) {
			throw new Error('AUTHENTIK_JWKS_URL ist nicht gesetzt');
		}
		jwks = createRemoteJWKSet(new URL(jwksUrl));
	}
	return jwks;
}
