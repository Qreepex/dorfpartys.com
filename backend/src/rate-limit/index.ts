import { TRPCError } from "@trpc/server";
import { and, eq, gt } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import type { Database } from "../db/index.js";
import { rateLimitCounter } from "../db/schema.js";

/**
 * DB-gestützter Fixed-Window-Rate-Limiter (nicht In-Memory) - das Backend
 * läuft mit mehreren Replicas (infra/k8s/backend/deployment.yaml, replicas:
 * 2), ein prozesslokaler Zähler würde je nach Load-Balancing effektiv bis zu
 * doppelt so hohe Limits erlauben. Kein Redis o.ä. eingeführt, da keine
 * vorhanden ist (infra/k8s) und die Fixed-Window-DB-Lösung für diese
 * Nutzerzahlen ausreicht - dasselbe Muster wie `report_rate_limit`
 * (backend/src/routers/reports.ts), hier generalisiert für mehrere Scopes.
 *
 * Fail-open bei DB-Fehlern (inkl. fehlender Tabelle vor einer Migration):
 * ein Ratelimit-Ausfall soll niemals normale Einreichungen blockieren.
 */
async function checkAndIncrement(
  db: Database,
  scope: string,
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean }> {
  try {
    const now = new Date();

    const [existing] = await db
      .select()
      .from(rateLimitCounter)
      .where(
        and(
          eq(rateLimitCounter.scope, scope),
          eq(rateLimitCounter.key, key),
          gt(rateLimitCounter.resetAt, now),
        ),
      );

    if (!existing) {
      // Kein aktives Fenster (noch nie gesehen oder abgelaufen) - neues
      // Fenster starten. onConflictDoUpdate fängt die Race Condition ab,
      // wenn zwei Requests gleichzeitig das erste neue Fenster eröffnen.
      await db
        .insert(rateLimitCounter)
        .values({
          scope,
          key,
          count: 1,
          resetAt: new Date(now.getTime() + windowMs),
        })
        .onConflictDoUpdate({
          target: [rateLimitCounter.scope, rateLimitCounter.key],
          set: { count: 1, resetAt: new Date(now.getTime() + windowMs) },
        });
      return { allowed: true };
    }

    if (existing.count >= limit) {
      return { allowed: false };
    }

    await db
      .update(rateLimitCounter)
      .set({ count: existing.count + 1 })
      .where(
        and(
          eq(rateLimitCounter.scope, scope),
          eq(rateLimitCounter.key, key),
        ),
      );
    return { allowed: true };
  } catch (err: any) {
    if (err?.code === "42P01") {
      console.warn(
        `rate_limit_counter Tabelle nicht gefunden - Ratelimit für scope="${scope}" übersprungen. Run: pnpm --filter backend db:migrate`,
      );
      return { allowed: true };
    }
    console.error(`Rate limit check error (scope="${scope}"):`, err);
    return { allowed: true };
  }
}

export type RateLimitRule = { limit: number; windowMs: number };

const HOUR_MS = 60 * 60 * 1000;

/**
 * Limits sind eine erste, konservative Schätzung für eine kleine,
 * community-getriebene Seite - bewusst großzügig genug, dass reguläre
 * Nutzer:innen sie im Normalbetrieb nie erreichen, aber eng genug, um
 * automatisiertes Massen-Anlegen/Hochladen zu bremsen. Bei Bedarf hier
 * zentral nachjustieren (Production-Tuning nach echten Nutzungsdaten nötig).
 */
export const RATE_LIMITS = {
  eventCreatePerUser: { limit: 5, windowMs: HOUR_MS } satisfies RateLimitRule,
  eventCreatePerIp: { limit: 10, windowMs: HOUR_MS } satisfies RateLimitRule,
  uploadPerUser: { limit: 20, windowMs: HOUR_MS } satisfies RateLimitRule,
  uploadPerIp: { limit: 40, windowMs: HOUR_MS } satisfies RateLimitRule,
} as const;

/**
 * Ermittelt die Client-IP für Ratelimiting-Zwecke. Das Backend ist nur
 * clusterintern erreichbar (AGENTS.md Abschnitt 0/7, kein Ingress-Pfad,
 * siehe infra/k8s/ingress/ingress.yaml) - der einzige Aufrufer ist das
 * Frontend, das die tatsächliche Client-IP im `x-forwarded-for`-Header
 * durchreicht (frontend/src/lib/trpc-client/index.ts). Mit `trustProxy: true`
 * in der Fastify-Bootstrap (backend/src/index.ts) löst Fastify `request.ip`
 * bereits korrekt aus diesem Header auf.
 */
export function getClientIp(req: FastifyRequest): string {
  return req.ip || "unknown";
}

/**
 * Prüft ein Rate-Limit für eine Aktion+Dimension und wirft bei Überschreitung
 * einen TRPCError mit Code TOO_MANY_REQUESTS. Der `message`-Text läuft über
 * denselben Fehlerpfad, der bereits generische 500er durch verständliche
 * Meldungen ersetzt (backend/src/trpc/trpc.ts errorFormatter,
 * frontend/src/routes/veranstaltung-eintragen/+page.server.ts
 * `err instanceof Error ? err.message : ...`).
 */
export async function enforceRateLimit(
  db: Database,
  scope: string,
  key: string,
  rule: RateLimitRule,
  message: string,
): Promise<void> {
  const { allowed } = await checkAndIncrement(
    db,
    scope,
    key,
    rule.limit,
    rule.windowMs,
  );
  if (!allowed) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message });
  }
}
