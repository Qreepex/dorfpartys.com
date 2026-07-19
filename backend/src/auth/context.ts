import type {} from '@fastify/cookie';
import type { FastifyRequest } from 'fastify';
import type { Database } from '../db/index.js';
import { verifyAuthentikToken } from './verify.js';
import { resolveUserFromClaims } from './user.js';
import type { user as userTable } from '../db/schema.js';

export type AuthUser = typeof userTable.$inferSelect;

const SESSION_COOKIE_NAME = 'dp_session';

function extractToken(req: FastifyRequest): string | undefined {
	const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
	if (cookieToken) return cookieToken;

	const authHeader = req.headers.authorization;
	if (authHeader?.startsWith('Bearer ')) {
		return authHeader.slice('Bearer '.length);
	}
	return undefined;
}

/**
 * Baut den Auth-Teil des tRPC-Contexts. Kein gültiges/vorhandenes JWT ->
 * `user: null`, öffentliche Prozeduren bleiben nutzbar (AGENTS.md Abschnitt 5).
 */
export async function resolveAuthContext(
	req: FastifyRequest,
	db: Database
): Promise<{ user: AuthUser | null }> {
	const token = extractToken(req);
	if (!token) return { user: null };

	try {
		const claims = await verifyAuthentikToken(token);
		const user = await resolveUserFromClaims(db, claims);
		return { user: user ?? null };
	} catch {
		return { user: null };
	}
}
