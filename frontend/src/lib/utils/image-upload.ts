import { MAX_IMAGE_SIZE_BYTES } from '@dorfpartys/shared';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png']);
const MAX_DIMENSION = 1920;

export interface ImageProcessingError {
	type: 'invalid_type' | 'unknown';
	message: string;
}

/**
 * Client-side image processing for UX optimization (not security).
 * - Validates file type
 * - Resizes if dimensions exceed 1920px
 * - Compresses if file size exceeds 1MB
 *
 * Backend still performs full validation/re-encoding for security.
 */
export async function validateAndOptimizeImage(
	file: File
): Promise<{ blob: Blob; type: 'image/jpeg' | 'image/png' } | ImageProcessingError> {
	if (!ALLOWED_TYPES.has(file.type)) {
		return {
			type: 'invalid_type',
			message: 'Nur JPG und PNG Dateien sind erlaubt'
		};
	}

	return optimizeImage(file);
}

async function optimizeImage(
	file: File
): Promise<{ blob: Blob; type: 'image/jpeg' | 'image/png' } | ImageProcessingError> {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const img = new Image();
			img.onload = () => {
				try {
					let width = img.width;
					let height = img.height;
					let quality = 0.85;

					// Step 1: Resize if larger than 1920px
					if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
						const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
						width = Math.floor(width * scale);
						height = Math.floor(height * scale);
					}

					// Step 2: Compress if needed
					encodeImage(img, file.type as 'image/jpeg' | 'image/png', width, height, quality);
				} catch (err) {
					resolve({
						type: 'unknown',
						message: err instanceof Error ? err.message : 'Bild konnte nicht verarbeitet werden'
					});
				}
			};

			img.onerror = () => {
				resolve({
					type: 'unknown',
					message: 'Bild konnte nicht geladen werden'
				});
			};

			img.src = e.target?.result as string;
		};

		reader.onerror = () => {
			resolve({
				type: 'unknown',
				message: 'Datei konnte nicht gelesen werden'
			});
		};

		reader.readAsDataURL(file);

		function encodeImage(
			img: HTMLImageElement,
			mimeType: 'image/jpeg' | 'image/png',
			width: number,
			height: number,
			quality: number
		) {
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext('2d');
			if (!ctx) {
				resolve({
					type: 'unknown',
					message: 'Canvas konnte nicht initialisiert werden'
				});
				return;
			}

			ctx.drawImage(img, 0, 0, width, height);

			// Try encoding with current quality
			const attemptEncode = (currentQuality: number) => {
				canvas.toBlob(
					(blob) => {
						if (!blob) {
							resolve({
								type: 'unknown',
								message: 'Bild konnte nicht kodiert werden'
							});
							return;
						}

						// If size is acceptable, return
						if (blob.size <= MAX_IMAGE_SIZE_BYTES) {
							resolve({
								blob,
								type: mimeType
							});
							return;
						}

						// Try lower quality for JPEG
						if (mimeType === 'image/jpeg' && currentQuality > 0.3) {
							attemptEncode(currentQuality - 0.1);
						} else {
							// Quality is low enough; return as-is (backend will validate)
							resolve({
								blob,
								type: mimeType
							});
						}
					},
					mimeType,
					mimeType === 'image/jpeg' ? currentQuality : undefined
				);
			};

			attemptEncode(quality);
		}
	});
}
