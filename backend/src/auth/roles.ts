import type { UserRole } from '@dorfpartys/shared';

/**
 * Mapping Authentik-Gruppen -> App-Rollen. Konkrete Gruppennamen sind ein
 * offener Punkt (AGENTS.md Abschnitt 10) und daher über ENV konfigurierbar,
 * mit sinnvollen Default-Namen.
 */
export function mapAuthentikGroupsToRole(groups: string[]): UserRole {
	const adminGroup = process.env.AUTHENTIK_ADMIN_GROUP ?? 'admin';
	const moderatorGroup = process.env.AUTHENTIK_MODERATOR_GROUP ?? 'moderator';

	if (groups.includes(adminGroup)) return 'admin';
	if (groups.includes(moderatorGroup)) return 'moderator';
	return 'user';
}
