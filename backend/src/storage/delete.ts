import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getS3Bucket, getS3Client } from "./s3.js";

/**
 * Entfernt einen S3-Key aktiv, z.B. beim Ersetzen eines Event-Fotos/Avatars
 * (AGENTS.md 7.1) — verhindert verwaiste öffentlich lesbare Dateien.
 */
export async function deleteS3Object(s3Key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: getS3Bucket(), Key: s3Key }),
  );
}
