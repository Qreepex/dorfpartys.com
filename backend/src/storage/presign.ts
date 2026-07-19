import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Bucket, getS3Client } from './s3.js';

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PRESIGN_EXPIRY_SECONDS = 300;

export interface PresignedUpload {
	uploadUrl: string;
	s3Key: string;
}

/**
 * Presigned Upload-URL für Event-Fotos/Profilbilder. Der Client lädt direkt
 * gegen IONOS S3 hoch — Zugangsdaten bleiben serverseitig (AGENTS.md Abschnitt 7).
 */
export async function createPresignedUpload(
	prefix: 'events' | 'profiles',
	ownerId: string,
	contentType: string
): Promise<PresignedUpload> {
	if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
		throw new Error(`Nicht erlaubter Content-Type: ${contentType}`);
	}

	const extension = contentType.split('/')[1];
	const s3Key = `${prefix}/${ownerId}/${randomUUID()}.${extension}`;

	const command = new PutObjectCommand({
		Bucket: getS3Bucket(),
		Key: s3Key,
		ContentType: contentType
	});

	const uploadUrl = await getSignedUrl(getS3Client(), command, {
		expiresIn: PRESIGN_EXPIRY_SECONDS
	});

	return { uploadUrl, s3Key };
}
