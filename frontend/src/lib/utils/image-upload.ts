import { MAX_IMAGE_SIZE_BYTES } from '@dorfpartys/shared';

const DEFAULT_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png']);

// Wenn ein bereits passendes Bild (Dimensionen + Bytes) zufällig sehr klein
// kodiert ist, lohnt sich das Re-Encoding nicht - nur eine "echt schon
// passende" Datei wird 1:1 durchgereicht, um unnötigen Qualitätsverlust zu
// vermeiden (Produktvorgabe).
const SKIP_REENCODE_MAX_BYTES = 300 * 1024;

// Untergrenze für die progressive Verkleinerung (siehe encodeWithSizeLimit
// unten) - verhindert, dass ein extrem detailreiches/verrauschtes Bild bis
// zur Unkenntlichkeit geschrumpft wird, nur um irgendwie unter das Byte-Limit
// zu kommen.
const MIN_SHRINK_DIMENSION = 480;
const DIMENSION_SHRINK_FACTOR = 0.85;
const MIN_JPEG_QUALITY = 0.35;

export interface ImageProcessingError {
	type: 'invalid_type' | 'unknown';
	message: string;
}

export interface OptimizeImageOptions {
	/** Erlaubte MIME-Types (Whitelist). Default: JPEG/PNG. */
	allowedTypes?: Set<string>;
	/** Maximale Kantenlänge nach dem Resize. Default: 1920. */
	maxDimension?: number;
	/**
	 * Ziel-Dateigröße in Bytes - wird clientseitig hart durchgesetzt (JPEG-
	 * Qualität + Kantenlänge werden iterativ gesenkt, PNGs ohne Kompressions-
	 * spielraum werden bei Bedarf zu JPEG), nicht nur "versucht". Das Backend
	 * validiert/re-encoded unabhängig davon nochmal, ist aber reine
	 * Malware-/Format-Prüfung, keine Kompression (siehe
	 * backend/src/storage/image-validation.ts). Default: @dorfpartys/shared
	 * MAX_IMAGE_SIZE_BYTES (1MB).
	 */
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
 * Client-seitige Bildverarbeitung - Resize, optionaler Center-Crop, iterative
 * Komprimierung mit einer hart durchgesetzten Ziel-Dateigröße. Von Profilbild-
 * und Event-Foto-Upload gemeinsam genutzt (siehe PhotoUpload.svelte). Das
 * Backend prüft/re-encoded das Ergebnis nochmal (Virenschutz/Format-
 * Validierung, siehe backend/src/storage/image-validation.ts), komprimiert
 * aber nicht - die Größenbegrenzung ist ausschließlich Aufgabe dieser Funktion.
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
						resolveSquareCrop(img, file, maxDimension, maxSizeBytes, resolve);
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

/**
 * Kodiert den Inhalt, den `draw(width, height)` auf `canvas` zeichnet, so
 * lange neu (sinkende JPEG-Qualität, danach ggf. PNG→JPEG-Formatwechsel,
 * danach sinkende Kantenlänge), bis das Ergebnis `maxSizeBytes` unterschreitet
 * - garantiert (bis auf einen extremen Rand-/Untergrenzenfall) eine Datei
 * unter dem Limit, statt wie zuvor bei ausgereizter Qualität einfach
 * aufzugeben und die übergroße Datei dem Backend zur Ablehnung zu überlassen.
 */
function encodeWithSizeLimit(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	draw: (width: number, height: number) => void,
	initialWidth: number,
	initialHeight: number,
	mimeType: 'image/jpeg' | 'image/png',
	maxSizeBytes: number,
	resolve: (result: OptimizeImageResult) => void
) {
	function attempt(
		width: number,
		height: number,
		quality: number,
		encodeType: 'image/jpeg' | 'image/png'
	) {
		canvas.width = width;
		canvas.height = height;

		// Weißer Hintergrund vor jedem (Re-)Zeichnen: verhindert schwarze
		// Flächen, falls ein transparentes PNG weiter unten doch als JPEG
		// kodiert wird (JPEG kennt keine Transparenz). Für Event-/Profilfotos
		// ist Transparenz ohnehin kein Feature (AGENTS.md), Konsistenz ist
		// hier wichtiger als das letzte Bit visueller Treue.
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, width, height);
		draw(width, height);

		canvas.toBlob(
			(blob) => {
				if (!blob) {
					resolve({ type: 'unknown', message: 'Bild konnte nicht kodiert werden' });
					return;
				}

				if (blob.size <= maxSizeBytes) {
					resolve({ blob, type: encodeType });
					return;
				}

				if (encodeType === 'image/jpeg' && quality > MIN_JPEG_QUALITY) {
					attempt(width, height, quality - 0.1, encodeType);
					return;
				}

				if (encodeType === 'image/png') {
					// PNG kennt keine Qualitätsstufen - für Fotos komprimiert JPEG
					// deutlich besser, daher zuerst das Format wechseln, bevor die
					// Auflösung verkleinert wird.
					attempt(width, height, 0.85, 'image/jpeg');
					return;
				}

				if (width > MIN_SHRINK_DIMENSION && height > MIN_SHRINK_DIMENSION) {
					const nextWidth = Math.max(
						MIN_SHRINK_DIMENSION,
						Math.floor(width * DIMENSION_SHRINK_FACTOR)
					);
					const nextHeight = Math.max(
						MIN_SHRINK_DIMENSION,
						Math.floor(height * DIMENSION_SHRINK_FACTOR)
					);
					attempt(nextWidth, nextHeight, 0.85, encodeType);
					return;
				}

				// Untergrenze erreicht - bestmögliches Ergebnis zurückgeben (extrem
				// seltener Grenzfall bei sehr kleinem `maxSizeBytes`).
				resolve({ blob, type: encodeType });
			},
			encodeType,
			encodeType === 'image/jpeg' ? quality : undefined
		);
	}

	attempt(initialWidth, initialHeight, 0.85, mimeType);
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
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		resolve({ type: 'unknown', message: 'Canvas konnte nicht initialisiert werden' });
		return;
	}

	encodeWithSizeLimit(
		canvas,
		ctx,
		(w, h) => ctx.drawImage(img, 0, 0, w, h),
		width,
		height,
		mimeType,
		maxSizeBytes,
		resolve
	);
}

function resolveSquareCrop(
	img: HTMLImageElement,
	file: File,
	maxDimension: number,
	maxSizeBytes: number,
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
		srcWidth === srcHeight &&
		srcWidth <= maxDimension &&
		file.size <= Math.min(SKIP_REENCODE_MAX_BYTES, maxSizeBytes);

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
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		resolve({ type: 'unknown', message: 'Canvas konnte nicht initialisiert werden' });
		return;
	}

	encodeWithSizeLimit(
		canvas,
		ctx,
		(w, h) => ctx.drawImage(img, sourceX, sourceY, squareSide, squareSide, 0, 0, w, h),
		targetSize,
		targetSize,
		// Avatare sind immer JPEG (Produktvorgabe, siehe bestehendes
		// Verhalten) - kein PNG-Zwischenschritt nötig.
		'image/jpeg',
		maxSizeBytes,
		resolve
	);
}
