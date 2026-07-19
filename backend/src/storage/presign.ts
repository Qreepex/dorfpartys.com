import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Bucket, getS3Client } from "./s3.js";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const PRESIGN_EXPIRY_SECONDS = 300;
export const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export interface PresignedUpload {
  uploadUrl: string;
  s3Key: string;
}

function assertUploadAllowed(contentType: string, fileSizeBytes: number) {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error(`Nicht erlaubter Content-Type: ${contentType}`);
  }
  // SigV4-presignte PUT-URLs unterstützen kein serverseitig erzwungenes
  // content-length-range (anders als S3-POST-Policies) — die Prüfung hier
  // ist ein Server-seitiger Grenzwert-Check auf den vom Client angegebenen
  // Wert, kein kryptographisch durchgesetztes Limit (AGENTS.md 7.1).
  if (fileSizeBytes <= 0 || fileSizeBytes > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error(
      `Dateigröße muss zwischen 1 Byte und ${MAX_UPLOAD_SIZE_BYTES} Byte liegen`,
    );
  }
}

async function presignPut(s3Key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getS3Bucket(),
    Key: s3Key,
    ContentType: contentType,
  });
  return getSignedUrl(getS3Client(), command, {
    expiresIn: PRESIGN_EXPIRY_SECONDS,
  });
}

/**
 * Presigned Upload-URL für ein Event-Foto, geschlüsselt unter der Event-ID
 * (AGENTS.md 7.1) — nicht dem Slug, der existiert erst nach dem Approval
 * (1.7). Die Event-ID wird vom Client vor dem eigentlichen `events.create`
 * generiert (siehe `submitEventInputSchema.id`), damit Fotos schon beim
 * Einreichen hochgeladen werden können.
 */
export async function createPresignedEventPhotoUpload(
  eventId: string,
  contentType: string,
  fileSizeBytes: number,
): Promise<PresignedUpload> {
  assertUploadAllowed(contentType, fileSizeBytes);
  const extension = contentType.split("/")[1];
  const s3Key = `events/${eventId}/${randomUUID()}.${extension}`;
  return { uploadUrl: await presignPut(s3Key, contentType), s3Key };
}

/** Presigned Upload-URL für ein Profilbild, geschlüsselt unter der User-ID (AGENTS.md 7.1). */
export async function createPresignedAvatarUpload(
  userId: string,
  contentType: string,
  fileSizeBytes: number,
): Promise<PresignedUpload> {
  assertUploadAllowed(contentType, fileSizeBytes);
  const extension = contentType.split("/")[1];
  const s3Key = `profiles/${userId}/${randomUUID()}.${extension}`;
  return { uploadUrl: await presignPut(s3Key, contentType), s3Key };
}
