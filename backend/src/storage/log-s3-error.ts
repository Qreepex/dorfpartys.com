import type { FastifyBaseLogger } from "fastify";

/**
 * Gemeinsame Logging-Helper für fehlgeschlagene S3-Operationen (Upload +
 * Delete, siehe image-validation.ts/uploads.ts-Router und delete.ts). Der AWS
 * SDK liefert bei einer nicht-AWS-konformen Fehlerantwort (z.B. IONOS) oft nur
 * ein generisches `UnknownError` ohne brauchbare `.message` - `$metadata`
 * (HTTP-Statuscode, Request-ID) ist in solchen Fällen die einzige verlässliche
 * Diagnose-Information, daher wird sie hier immer mitgeloggt.
 */
export function logS3Error(
  log: FastifyBaseLogger,
  err: unknown,
  context: Record<string, unknown>,
  message: string,
): void {
  const metadata =
    err && typeof err === "object" && "$metadata" in err
      ? (err as { $metadata?: unknown }).$metadata
      : undefined;
  log.error({ err, ...context, metadata }, message);
}
