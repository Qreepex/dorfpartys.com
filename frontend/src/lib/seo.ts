/** index,follow nur bei Treffern > 0 (AGENTS.md 1.6). */
export function robotsContent(indexable: boolean): string {
	return indexable ? 'index,follow' : 'noindex,follow';
}

/**
 * Rendert ein JSON-LD <script>-Tag für {@html} in <svelte:head>. `<` wird
 * escaped, damit user-generierte Feldwerte (z.B. Event-Titel) nicht aus dem
 * script-Tag ausbrechen können.
 */
export function jsonLdScriptTag(data: unknown): string {
	const json = JSON.stringify(data).replace(/</g, '\\u003c');
	return `<script type="application/ld+json">${json}</script>`;
}
