import { and, eq, inArray, lt } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import type { Database } from "../db/index.js";
import { pendingUpload } from "../db/schema.js";
import { deleteS3Object } from "./delete.js";

// Wie lange ein hochgeladener, aber noch nicht an einen Datensatz
// angehängter S3-Key toleriert wird, bevor der Sweep ihn löscht. 15 Minuten
// reichen für ein normales Ausfüllen des Event-Formulars locker aus, sind aber
// kurz genug, um abgebrochene Vorgänge (Tab geschlossen, Formular nie
// abgeschickt) nicht dauerhaft im Bucket anzusammeln (Produktvorgabe).
export const PENDING_UPLOAD_TTL_MS = 15 * 60 * 1000;

/** Registriert einen frisch hochgeladenen S3-Key als "noch nicht bestätigt". */
export async function trackPendingUpload(
  db: Database,
  s3Key: string,
  uploadedByUserId: string,
): Promise<void> {
  await db.insert(pendingUpload).values({ s3Key, uploadedByUserId });
}

/**
 * Markiert einen S3-Key als "verwendet" (an einen echten Datensatz
 * angehängt, z.B. Event gespeichert oder Avatar gesetzt) - entfernt ihn
 * einfach aus dem Pending-Tracking, damit der Sweep ihn nicht später löscht.
 * No-op (kein Fehler), wenn der Key gar nicht (mehr) getrackt ist.
 */
export async function confirmUpload(
  db: Database,
  s3Key: string,
): Promise<void> {
  await db.delete(pendingUpload).where(eq(pendingUpload.s3Key, s3Key));
}

/**
 * Best-effort Sofort-Löschung eines noch nicht bestätigten Uploads, der dem
 * angegebenen Nutzer gehört - z.B. wenn ein Foto im Event-Formular ersetzt
 * oder entfernt wird, bevor überhaupt abgeschickt wurde (sonst müsste man auf
 * den nächsten Sweep warten). Die Ownership-Prüfung in der WHERE-Klausel
 * verhindert, dass jemand fremde oder bereits bestätigte/angehängte Keys
 * löschen lässt. Gibt `true` zurück, wenn tatsächlich etwas gelöscht wurde.
 */
export async function discardPendingUpload(
  db: Database,
  s3Key: string,
  uploadedByUserId: string,
  log: FastifyBaseLogger,
): Promise<boolean> {
  const [pending] = await db
    .select()
    .from(pendingUpload)
    .where(
      and(
        eq(pendingUpload.s3Key, s3Key),
        eq(pendingUpload.uploadedByUserId, uploadedByUserId),
      ),
    );

  if (!pending) return false;

  await deleteS3Object(pending.s3Key, log);
  await db.delete(pendingUpload).where(eq(pendingUpload.id, pending.id));
  return true;
}

/**
 * Löscht alle Uploads, die seit mehr als `PENDING_UPLOAD_TTL_MS` offen sind
 * (nie bestätigt) - Sicherheitsnetz für alles, was `discardPendingUpload`
 * nicht erwischt (Tab geschlossen, Netzwerkabbruch, Browser-Crash, ...).
 * Wird periodisch aufgerufen, siehe backend/src/index.ts.
 */
export async function sweepPendingUploads(
  db: Database,
  log: FastifyBaseLogger,
): Promise<number> {
  const cutoff = new Date(Date.now() - PENDING_UPLOAD_TTL_MS);
  const stale = await db
    .select()
    .from(pendingUpload)
    .where(lt(pendingUpload.createdAt, cutoff));

  if (stale.length === 0) return 0;

  for (const row of stale) {
    await deleteS3Object(row.s3Key, log);
  }

  await db.delete(pendingUpload).where(
    inArray(
      pendingUpload.id,
      stale.map((row) => row.id),
    ),
  );

  return stale.length;
}
