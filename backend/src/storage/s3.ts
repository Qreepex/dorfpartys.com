import { S3Client } from '@aws-sdk/client-s3';

let client: S3Client | undefined;

/** IONOS S3 (S3-kompatibel) über speicher.dorfpartys.com (AGENTS.md Abschnitt 7). */
export function getS3Client(): S3Client {
	if (!client) {
		const endpoint = process.env.S3_ENDPOINT;
		const accessKeyId = process.env.S3_ACCESS_KEY;
		const secretAccessKey = process.env.S3_SECRET_KEY;

		if (!endpoint || !accessKeyId || !secretAccessKey) {
			throw new Error('S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY sind nicht gesetzt');
		}

		client = new S3Client({
			endpoint,
			region: process.env.S3_REGION ?? 'eu-central-1',
			credentials: { accessKeyId, secretAccessKey },
			forcePathStyle: true
		});
	}
	return client;
}

export function getS3Bucket(): string {
	const bucket = process.env.S3_BUCKET;
	if (!bucket) {
		throw new Error('S3_BUCKET ist nicht gesetzt');
	}
	return bucket;
}
