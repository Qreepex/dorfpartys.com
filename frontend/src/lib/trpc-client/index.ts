import { env } from '$env/dynamic/private';
import type { AppRouter } from '@dorfpartys/backend';
import { createTRPCClient, httpBatchLink } from '@trpc/client';

/**
 * Frontend -> Backend läuft intern im Cluster über K8s-Service-DNS, nicht
 * über die öffentliche Domain (AGENTS.md Abschnitt 0). Der Cookie-Header
 * des eingehenden Requests wird durchgereicht, damit das Backend die
 * Authentik-Session zustandslos verifizieren kann (AGENTS.md Abschnitt 5).
 *
 * `clientIp` wird als `x-forwarded-for` an das Backend durchgereicht: das
 * Backend ist nur clusterintern erreichbar (kein Ingress-Pfad, siehe
 * infra/k8s/ingress/ingress.yaml) und sieht ohne diesen Header nur die
 * interne Pod-IP dieses Frontend-Replicas, nicht die echte Browser-IP - für
 * IP-basiertes Ratelimiting im Backend (backend/src/rate-limit/index.ts)
 * sonst unbrauchbar. Der Aufrufer ermittelt `clientIp` primär aus dem von
 * Cloudflare gesetzten `cf-connecting-ip`-Header, mit `event.getClientAddress()`
 * als Fallback (frontend/src/hooks.server.ts).
 */
export function createBackendClient(cookieHeader: string | null, clientIp?: string | null) {
	return createTRPCClient<AppRouter>({
		links: [
			httpBatchLink({
				url: `${env.BACKEND_INTERNAL_URL ?? 'http://localhost:3033'}/trpc`,
				headers: () => ({
					...(cookieHeader ? { cookie: cookieHeader } : {}),
					...(clientIp ? { 'x-forwarded-for': clientIp } : {})
				})
			})
		]
	});
}

export type BackendClient = ReturnType<typeof createBackendClient>;
