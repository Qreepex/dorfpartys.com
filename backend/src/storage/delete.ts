import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { FastifyBaseLogger } from "fastify";
import { getS3Bucket, getS3Client } from "./s3.js";
import { logS3Error } from "./log-s3-error.js";

/**
 * Entfernt einen S3-Key aktiv, z.B. beim Ersetzen eines Event-Fotos/Avatars
 * (AGENTS.md 7.1) - verhindert verwaiste öffentlich lesbare Dateien.
 *
 * Bewusst best-effort und wirft NIE: das ist ein Aufräumschritt NACH der
 * eigentlichen, bereits erfolgreichen Operation (neues Foto ist schon
 * hochgeladen/in der DB verknüpft) - ein Fehler hier (z.B. fehlende
 * `s3:DeleteObject`-Berechtigung in der Bucket-Policy) darf die eigentliche
 * Operation nicht rückgängig machen bzw. deren DB-Schreibvorgang verhindern.
 * Fehler werden stattdessen mit vollem Kontext geloggt, damit verwaiste
 * Dateien im Betrieb auffallen, statt den Nutzer mit einer kryptischen
 * AWS-SDK-Meldung (z.B. "UnknownError" bei einer nicht-AWS-konformen
 * Fehlerantwort) hängen zu lassen.
 */
export async function deleteS3Object(
  s3Key: string,
  log: FastifyBaseLogger,
): Promise<void> {
  try {
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: getS3Bucket(), Key: s3Key }),
    );
  } catch (err) {
    logS3Error(
      log,
      err,
      { s3Key },
      "S3 delete failed - Datei bleibt verwaist im Bucket zurück",
    );
  }
}
