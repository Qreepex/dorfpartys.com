import { MAX_AVATAR_DIMENSION, MAX_IMAGE_SIZE_BYTES } from '@dorfpartys/shared';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png']);
const MAX_DIMENSION = 1920;

// Wenn ein bereits quadratisches, kleines Bild zufällig sehr groß kodiert ist
// (seltener Edge-Case, z.B. unkomprimiertes PNG), lohnt sich das
// Re-Encoding trotzdem - nur eine "echt schon passende" Datei wird 1:1
// durchgereicht, um unnötigen Qualitätsverlust zu vermeiden (Produktvorgabe).
const AVATAR_SKIP_REENCODE_MAX_BYTES = 300 * 1024;

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

/**
 * Client-seitiges Resizing/Cropping für Profilbilder (AGENTS.md Abschnitt 3:
 * "bis zu 128x128"). Avatare werden überall quadratisch/rund dargestellt
 * (Navbar-User-Card, Veranstalter-Seite: `rounded-full` + `object-cover`),
 * daher hier bewusst Center-Crop auf ein Quadrat statt nur "fit within" -
 * ein rundes Ausgabeelement mit einem nicht-quadratischen Source-Bild würde
 * sonst verzerrt oder mit Rand-Freiräumen dargestellt.
 *
 * Bereits passende Bilder (quadratisch, <= 128px, klein genug) werden
 * unverändert durchgereicht, um keine unnötige Qualität zu verlieren. Das
 * Backend erzwingt dieselbe 128x128-Grenze serverseitig nochmal
 * (backend/src/storage/image-validation.ts, `constrainToSquareMax`) - dem
 * Client wird hier nur aus UX-/Bandbreiten-Gründen vertraut, nicht aus
 * Sicherheitsgründen.
 */
export async function validateAndOptimizeAvatarImage(
	file: File
): Promise<{ blob: Blob; type: 'image/jpeg' | 'image/png' } | ImageProcessingError> {
	if (!ALLOWED_TYPES.has(file.type)) {
		return {
			type: 'invalid_type',
			message: 'Nur JPG und PNG Dateien sind erlaubt'
		};
	}

	return optimizeAvatarImage(file);
}

async function optimizeAvatarImage(
	file: File
): Promise<{ blob: Blob; type: 'image/jpeg' | 'image/png' } | ImageProcessingError> {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const img = new Image();
			img.onload = () => {
				try {
					const srcWidth = img.naturalWidth;
					const srcHeight = img.naturalHeight;

					if (!srcWidth || !srcHeight) {
						resolve({
							type: 'unknown',
							message: 'Bild hat ungültige Abmessungen'
						});
						return;
					}

					// Schon quadratisch, innerhalb der Zielgröße und klein genug in
					// Bytes - kein Grund, nochmal neu zu kodieren.
					const alreadyOptimal =
						srcWidth === srcHeight &&
						srcWidth <= MAX_AVATAR_DIMENSION &&
						file.size <= AVATAR_SKIP_REENCODE_MAX_BYTES;

					if (alreadyOptimal) {
						resolve({ blob: file, type: file.type as 'image/jpeg' | 'image/png' });
						return;
					}

					// Center-Crop auf ein Quadrat (kürzere Seite), danach nur
					// runterskalieren (nie hochskalieren) auf max. 128px.
					const squareSide = Math.min(srcWidth, srcHeight);
					const targetSize = Math.min(MAX_AVATAR_DIMENSION, squareSide);
					const sourceX = Math.floor((srcWidth - squareSide) / 2);
					const sourceY = Math.floor((srcHeight - squareSide) / 2);

					const canvas = document.createElement('canvas');
					canvas.width = targetSize;
					canvas.height = targetSize;

					const ctx = canvas.getContext('2d');
					if (!ctx) {
						resolve({
							type: 'unknown',
							message: 'Canvas konnte nicht initialisiert werden'
						});
						return;
					}

					// Weißer Hintergrund, falls ein transparentes PNG nach JPEG
					// konvertiert wird (Transparenz ist für ein 128px-Rund-Avatar
					// nicht relevant, ein einheitliches Ausgabeformat schon).
					ctx.fillStyle = '#ffffff';
					ctx.fillRect(0, 0, targetSize, targetSize);
					ctx.drawImage(
						img,
						sourceX,
						sourceY,
						squareSide,
						squareSide,
						0,
						0,
						targetSize,
						targetSize
					);

					canvas.toBlob(
						(blob) => {
							if (!blob) {
								resolve({
									type: 'unknown',
									message: 'Bild konnte nicht kodiert werden'
								});
								return;
							}
							resolve({ blob, type: 'image/jpeg' });
						},
						'image/jpeg',
						0.9
					);
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
	});
}
