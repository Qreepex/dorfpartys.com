import type { UserRole } from '@dorfpartys/shared';

/**
 * Mapping Authentik-Gruppen -> App-Rollen. Der JWT-"groups"-Claim enthält
 * Gruppen-NAMEN (nicht die Authentik-Gruppen-IDs), siehe die "profile"-Scope-
 * Mapping der Authentik-Instanz. Gruppennamen sind daher über ENV konfigurierbar
 * (siehe .env.example), mit sinnvollen Default-Namen als Fallback.
 */
export function mapAuthentikGroupsToRole(groups: string[]): UserRole {
	const adminGroup = process.env.AUTHENTIK_ADMIN_GROUP ?? 'admin';
	const moderatorGroup = process.env.AUTHENTIK_MODERATOR_GROUP ?? 'moderator';

	if (groups.includes(adminGroup)) return 'admin';
	if (groups.includes(moderatorGroup)) return 'moderator';
	return 'user';
}
