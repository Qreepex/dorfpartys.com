/**
 * Der Bucket ist öffentlich lesbar (Fotos sind ohnehin öffentlich sichtbar),
 * daher genügt für die Anzeige eine einfache öffentliche URL — kein
 * presigned GET nötig. Nur Uploads (PUT) laufen presigned (AGENTS.md 7).
 */
export function buildPublicStorageUrl(s3Key: string): string {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  if (!endpoint || !bucket) {
    throw new Error("S3_ENDPOINT/S3_BUCKET sind nicht gesetzt");
  }
  return `${endpoint.replace(/\/+$/, "")}/${bucket}/${s3Key}`;
}
