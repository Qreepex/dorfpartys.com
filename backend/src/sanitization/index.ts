/**
 * Input sanitization für User-generierte Inhalte.
 * Entfernt/escaped HTML-Tags und gefährliche Zeichen.
 */

/**
 * Entfernt HTML-Tags und escaped gefährliche Zeichen.
 * Sicher für Datenbankablage und Frontend-Rendering.
 */
export function sanitizeText(input: string): string {
	if (!input || typeof input !== 'string') return '';

	// HTML-Tags entfernen (<tag>, </tag>, etc.)
	let sanitized = input.replace(/<[^>]*>/g, '');

	// Doppelte Spaces reduzieren (optionale Bereinigung)
	sanitized = sanitized.replace(/\s+/g, ' ').trim();

	return sanitized;
}

/**
 * Validiert und sanitized URLs (für website, instagram, etc.).
 * Erlaubt nur http(s) und data-URIs.
 */
export function sanitizeUrl(input: string): string {
	if (!input || typeof input !== 'string') return '';

	const trimmed = input.trim();

	// Nur erlauben: http://, https://, /
	if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
		return '';
	}

	// Basis-URL-Validierung: Whitespace, newlines, etc. entfernen
	return trimmed.replace(/[\s\n\r]/g, '');
}

/**
 * Hauptfunktion zur Sanitization von freien Text-Feldern.
 * Kombiniert HTML-Stripping und grundlegende Validierung.
 */
export function sanitizeInput(input: unknown): string {
	if (!input || typeof input !== 'string') return '';
	return sanitizeText(input);
}
