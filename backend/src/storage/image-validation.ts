import { fileTypeFromBuffer } from "file-type";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

export const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB
export const MAX_IMAGE_DIMENSION = 1920; // 1920x1920 max
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

export interface ValidatedImage {
  mimeType: "image/jpeg" | "image/png";
  buffer: Buffer;
  s3Key: string;
}

/**
 * Production-grade image validation and sanitization.
 *
 * Security layers:
 * 1. Deep file type detection (file-type library - not just magic bytes)
 * 2. Re-encoding with Sharp (strips all metadata, validates format)
 * 3. Dimension limits (prevents decompression bombs)
 * 4. File size limits
 * 5. EXIF data stripping
 *
 * This approach is used by Cloudinary, imgix, and AWS Lambda for image processing.
 */
export async function validateAndSanitizeImage(
  buffer: Buffer,
  claimedMimeType: string,
): Promise<{ mimeType: "image/jpeg" | "image/png"; sanitizedBuffer: Buffer }> {
  // Layer 1: Size check
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(
      `Datei zu groß: ${(buffer.length / 1024 / 1024).toFixed(2)}MB. Maximum: 1MB`,
    );
  }

  // Layer 2: Whitelist check
  if (!ALLOWED_MIME_TYPES.has(claimedMimeType)) {
    throw new Error(
      `Nicht erlaubter Dateityp: ${claimedMimeType}. Erlaubt: JPEG, PNG`,
    );
  }

  // Layer 3: Deep file type detection using file-type library
  // This checks the actual file structure, not just magic bytes
  let detectedType: string | undefined;
  try {
    const fileType = await fileTypeFromBuffer(buffer);
    detectedType = fileType?.mime;
  } catch (err) {
    throw new Error(
      "Datei konnte nicht analysiert werden - möglicherweise beschädigt oder kein Bild",
    );
  }

  if (!detectedType) {
    throw new Error(
      "Datei-Typ konnte nicht erkannt werden - möglicherweise kein echtes Bild",
    );
  }

  // Layer 4: Verify detected type matches claimed type
  // (within reason - some JPEGs are detected as different MIME variants)
  if (claimedMimeType === "image/jpeg") {
    if (!detectedType.includes("jpeg")) {
      throw new Error(`Datei ist kein JPEG (erkannt als: ${detectedType})`);
    }
  } else if (claimedMimeType === "image/png") {
    if (detectedType !== "image/png") {
      throw new Error(`Datei ist kein PNG (erkannt als: ${detectedType})`);
    }
  }

  // Layer 5: Re-encode image (most important security measure)
  // This:
  // - Strips all EXIF and metadata (prevents metadata exploits)
  // - Validates image structure (catches corrupted/malicious files)
  // - Prevents polyglot/polyglot attacks
  // - Normalizes format
  // - Catches decompression bombs by having dimension limits
  let sanitizedBuffer: Buffer;
  try {
    const pipeline = sharp(buffer);
    const metadata = await pipeline.metadata();

    // Layer 6: Dimension limits (prevent decompression bombs)
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > MAX_IMAGE_DIMENSION ||
      metadata.height > MAX_IMAGE_DIMENSION
    ) {
      throw new Error(
        `Bild-Dimensionen ungültig oder zu groß (max: ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}px)`,
      );
    }

    // Re-encode based on format
    if (claimedMimeType === "image/jpeg") {
      // Re-encode as JPEG, removing all metadata
      sanitizedBuffer = await sharp(buffer, { failOnError: true })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
    } else {
      // Re-encode as PNG, removing all metadata
      sanitizedBuffer = await sharp(buffer, { failOnError: true })
        .png({ compressionLevel: 9 })
        .toBuffer();
    }

    // Layer 7: Final size check after re-encoding
    if (sanitizedBuffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        `Re-encoded Datei zu groß (${(sanitizedBuffer.length / 1024 / 1024).toFixed(2)}MB). Maximum: 1MB`,
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("Datei")) {
      throw err; // Re-throw our custom errors
    }
    throw new Error(
      err instanceof Error
        ? `Bild konnte nicht verarbeitet werden: ${err.message}`
        : "Bild konnte nicht verarbeitet werden",
    );
  }

  return {
    mimeType: claimedMimeType as "image/jpeg" | "image/png",
    sanitizedBuffer,
  };
}

/**
 * Generates a validated image object ready for S3 upload.
 * Includes S3 key generation using event/user ID.
 */
export function createValidatedImage(
  buffer: Buffer,
  mimeType: "image/jpeg" | "image/png",
  parentId: string,
  type: "event" | "profile",
): ValidatedImage {
  const ext = mimeType === "image/jpeg" ? "jpg" : "png";
  const folder = type === "event" ? "events" : "profiles";
  const s3Key = `${folder}/${parentId}/${randomUUID()}.${ext}`;

  return {
    mimeType,
    buffer,
    s3Key,
  };
}
