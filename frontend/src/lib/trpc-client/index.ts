import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@dorfpartys/backend';
import { env } from '$env/dynamic/private';

/**
 * Frontend -> Backend läuft intern im Cluster über K8s-Service-DNS, nicht
 * über die öffentliche Domain (AGENTS.md Abschnitt 0). Der Cookie-Header
 * des eingehenden Requests wird durchgereicht, damit das Backend die
 * Authentik-Session zustandslos verifizieren kann (AGENTS.md Abschnitt 5).
 */
export function createBackendClient(cookieHeader: string | null) {
	return createTRPCClient<AppRouter>({
		links: [
			httpBatchLink({
				url: `${env.BACKEND_INTERNAL_URL ?? 'http://backend:3000'}/trpc`,
				headers: () => (cookieHeader ? { cookie: cookieHeader } : {})
			})
		]
	});
}

export type BackendClient = ReturnType<typeof createBackendClient>;
