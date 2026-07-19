import { error, redirect } from '@sveltejs/kit';
import type { BackendClient } from '$lib/trpc-client/index.js';

/** Eingeloggt, beliebige Rolle (AGENTS.md Abschnitt 5: geschützt für /submit, /profil). */
export async function requireUser(trpc: BackendClient, currentPath: string) {
	try {
		return await trpc.users.me.query();
	} catch {
		redirect(302, `/auth/login?redirectTo=${encodeURIComponent(currentPath)}`);
	}
}

/** Review-Dashboard (AGENTS.md Abschnitt 5: geschützt für moderator/admin). */
export async function requireModerator(trpc: BackendClient, currentPath: string) {
	const user = await requireUser(trpc, currentPath);
	if (user.role !== 'moderator' && user.role !== 'admin') {
		error(403, 'Kein Zugriff auf das Review-Dashboard');
	}
	return user;
}
