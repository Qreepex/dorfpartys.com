import { MAX_IMAGE_SIZE_BYTES } from '@dorfpartys/shared';

const DEFAULT_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png']);

// Wenn ein bereits passendes Bild (Dimensionen + Bytes) zufällig sehr groß
// kodiert ist (seltener Edge-Case, z.B. unkomprimiertes PNG), lohnt sich das
// Re-Encoding trotzdem - nur eine "echt schon passende" Datei wird 1:1
// durchgereicht, um unnötigen Qualitätsverlust zu vermeiden (Produktvorgabe).
const SKIP_REENCODE_MAX_BYTES = 300 * 1024;

export interface ImageProcessingError {
	type: 'invalid_type' | 'unknown';
	message: string;
}

export interface OptimizeImageOptions {
	/** Erlaubte MIME-Types (Whitelist). Default: JPEG/PNG. */
	allowedTypes?: Set<string>;
	/** Maximale Kantenlänge nach dem Resize. Default: 1920. */
	maxDimension?: number;
	/** Ziel-Dateigröße in Bytes - JPEG-Qualität wird iterativ gesenkt, bis die Grenze passt. Default: @dorfpartys/shared MAX_IMAGE_SIZE_BYTES (1MB). */
	maxSizeBytes?: number;
	/**
	 * Center-Crop auf ein Quadrat vor dem Resize (z.B. für runde
	 * Profilbild-Vorschauen). Default: false ("fit within", Seitenverhältnis
	 * bleibt erhalten).
	 */
	squareCrop?: boolean;
}

export type OptimizeImageResult =
	{ blob: Blob; type: 'image/jpeg' | 'image/png' } | ImageProcessingError;

/**
 * Client-seitige Bildverarbeitung für UX (nicht für Sicherheit) - Resize,
 * optionaler Center-Crop, iterative JPEG-Komprimierung. Von Profilbild- und
 * Event-Foto-Upload gemeinsam genutzt (siehe PhotoUpload.svelte); das Backend
 * validiert/re-encoded unabhängig davon nochmal serverseitig
 * (backend/src/storage/image-validation.ts) - dem Client wird hier nur aus
 * Bandbreiten-/UX-Gründen vertraut.
 */
export async function optimizeImage(
	file: File,
	options: OptimizeImageOptions = {}
): Promise<OptimizeImageResult> {
	const allowedTypes = options.allowedTypes ?? DEFAULT_ALLOWED_TYPES;
	if (!allowedTypes.has(file.type)) {
		return {
			type: 'invalid_type',
			message: 'Nur JPG und PNG Dateien sind erlaubt'
		};
	}

	const maxDimension = options.maxDimension ?? 1920;
	const maxSizeBytes = options.maxSizeBytes ?? MAX_IMAGE_SIZE_BYTES;
	const squareCrop = options.squareCrop ?? false;

	return new Promise((resolve) => {
		const reader = new FileReader();

		reader.onerror = () => {
			resolve({ type: 'unknown', message: 'Datei konnte nicht gelesen werden' });
		};

		reader.onload = (e) => {
			const img = new Image();

			img.onerror = () => {
				resolve({ type: 'unknown', message: 'Bild konnte nicht geladen werden' });
			};

			img.onload = () => {
				try {
					if (squareCrop) {
						resolveSquareCrop(img, file, maxDimension, resolve);
					} else {
						resolveFit(
							img,
							file.type as 'image/jpeg' | 'image/png',
							maxDimension,
							maxSizeBytes,
							resolve
						);
					}
				} catch (err) {
					resolve({
						type: 'unknown',
						message: err instanceof Error ? err.message : 'Bild konnte nicht verarbeitet werden'
					});
				}
			};

			img.src = e.target?.result as string;
		};

		reader.readAsDataURL(file);
	});
}

function resolveFit(
	img: HTMLImageElement,
	mimeType: 'image/jpeg' | 'image/png',
	maxDimension: number,
	maxSizeBytes: number,
	resolve: (result: OptimizeImageResult) => void
) {
	let width = img.width;
	let height = img.height;

	if (width > maxDimension || height > maxDimension) {
		const scale = Math.min(maxDimension / width, maxDimension / height);
		width = Math.floor(width * scale);
		height = Math.floor(height * scale);
	}

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		resolve({ type: 'unknown', message: 'Canvas konnte nicht initialisiert werden' });
		return;
	}

	ctx.drawImage(img, 0, 0, width, height);

	const attemptEncode = (quality: number) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					resolve({ type: 'unknown', message: 'Bild konnte nicht kodiert werden' });
					return;
				}

				if (blob.size <= maxSizeBytes) {
					resolve({ blob, type: mimeType });
					return;
				}

				if (mimeType === 'image/jpeg' && quality > 0.3) {
					attemptEncode(quality - 0.1);
				} else {
					// Qualität ist niedrig genug ausgereizt - unverändert zurückgeben,
					// das Backend validiert/lehnt final ab (siehe image-validation.ts).
					resolve({ blob, type: mimeType });
				}
			},
			mimeType,
			mimeType === 'image/jpeg' ? quality : undefined
		);
	};

	attemptEncode(0.85);
}

function resolveSquareCrop(
	img: HTMLImageElement,
	file: File,
	maxDimension: number,
	resolve: (result: OptimizeImageResult) => void
) {
	const srcWidth = img.naturalWidth;
	const srcHeight = img.naturalHeight;

	if (!srcWidth || !srcHeight) {
		resolve({ type: 'unknown', message: 'Bild hat ungültige Abmessungen' });
		return;
	}

	// Schon quadratisch, innerhalb der Zielgröße und klein genug in Bytes -
	// kein Grund, nochmal neu zu kodieren.
	const alreadyOptimal =
		srcWidth === srcHeight && srcWidth <= maxDimension && file.size <= SKIP_REENCODE_MAX_BYTES;

	if (alreadyOptimal) {
		resolve({ blob: file, type: file.type as 'image/jpeg' | 'image/png' });
		return;
	}

	// Center-Crop auf ein Quadrat (kürzere Seite), danach nur runterskalieren
	// (nie hochskalieren) auf maxDimension.
	const squareSide = Math.min(srcWidth, srcHeight);
	const targetSize = Math.min(maxDimension, squareSide);
	const sourceX = Math.floor((srcWidth - squareSide) / 2);
	const sourceY = Math.floor((srcHeight - squareSide) / 2);

	const canvas = document.createElement('canvas');
	canvas.width = targetSize;
	canvas.height = targetSize;

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		resolve({ type: 'unknown', message: 'Canvas konnte nicht initialisiert werden' });
		return;
	}

	// Weißer Hintergrund, falls ein transparentes PNG nach JPEG konvertiert
	// wird (Transparenz ist für ein rundes Vorschaubild nicht relevant, ein
	// einheitliches Ausgabeformat schon).
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, targetSize, targetSize);
	ctx.drawImage(img, sourceX, sourceY, squareSide, squareSide, 0, 0, targetSize, targetSize);

	canvas.toBlob(
		(blob) => {
			if (!blob) {
				resolve({ type: 'unknown', message: 'Bild konnte nicht kodiert werden' });
				return;
			}
			resolve({ blob, type: 'image/jpeg' });
		},
		'image/jpeg',
		0.9
	);
}
