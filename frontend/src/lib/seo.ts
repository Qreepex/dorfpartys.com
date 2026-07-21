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

/**
 * Markiert eine exakte Teilzeichenkette innerhalb von `FaqEntry.answer`, die
 * in der sichtbaren Darstellung als klickbarer Link gerendert werden soll
 * (siehe FaqList.svelte). `answer` selbst bleibt ein reiner String, damit das
 * schema.org/FAQPage JSON-LD (buildFaqJsonLd) unverändert reinen Text liefert.
 */
export interface FaqLink {
	/** Exakte Teilzeichenkette in `answer`, die verlinkt werden soll. */
	text: string;
	/** Interner Routen-Pfad (wird über $app/paths resolve() aufgelöst) oder externe https://-URL. */
	href: string;
}

export interface FaqEntry {
	question: string;
	answer: string;
	links?: FaqLink[];
}

/**
 * schema.org/FAQPage JSON-LD - macht FAQ-Inhalte für Suchmaschinen-Rich-Snippets
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
