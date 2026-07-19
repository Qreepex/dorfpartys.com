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

export interface FaqEntry {
	question: string;
	answer: string;
}

/**
 * schema.org/FAQPage JSON-LD — macht FAQ-Inhalte für Suchmaschinen-Rich-Snippets
 * und KI-/LLM-Antwortmaschinen (Perplexity, ChatGPT-Suche, Google AI Overviews)
 * strukturiert auffindbar, nicht nur den sichtbaren Text.
 */
export function buildFaqJsonLd(entries: FaqEntry[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: entries.map((entry) => ({
			'@type': 'Question',
			name: entry.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: entry.answer
			}
		}))
	};
}
