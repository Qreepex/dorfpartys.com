import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3Bucket, getS3Client } from "./s3.js";

export const MAX_UPLOAD_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB

/**
 * Uploads a buffer directly to S3 with validation.
 * Called server-side after thorough file validation.
 */
export async function uploadToS3(
  s3Key: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: getS3Bucket(),
    Key: s3Key,
    Body: buffer,
    ContentType: contentType,
  });
  await getS3Client().send(command);
}
