<script lang="ts">
	import { resolve } from '$app/paths';
	import type { FaqEntry, FaqLink } from '$lib/seo.js';

	interface Props {
		items: FaqEntry[];
	}

	let { items }: Props = $props();

	interface AnswerSegment {
		text: string;
		href?: string;
		external?: boolean;
	}

	/**
	 * Interne Ziele, auf die FAQ-Antworten heute verlinken. `resolve()` braucht
	 * literale Routen-IDs (kein generischer String), daher hier explizit
	 * gemappt statt den href-String direkt an resolve() durchzureichen - bei
	 * einer neuen internen Verlinkung in faq.ts einfach einen Case ergänzen.
	 */
	function resolveInternalHref(href: string): string {
		switch (href) {
			case '/veranstaltung-eintragen':
				return resolve('/veranstaltung-eintragen');
			case '/partyliste':
				return resolve('/partyliste');
			case '/datenschutz':
				return resolve('/datenschutz');
			default:
				return href;
		}
	}

	/**
	 * Zerlegt `answer` an den in `links` markierten Teilstrings in Text- und
	 * Link-Segmente, damit URL-artige Erwähnungen (z.B. "dorfpartys.com/...")
	 * als echte <a href> gerendert werden statt als reiner, nicht klickbarer
	 * Text (siehe FaqLink in seo.ts).
	 */
	function splitAnswer(answer: string, links: FaqLink[] = []): AnswerSegment[] {
		const matches = links
			.map((link) => ({ link, index: answer.indexOf(link.text) }))
			.filter((match) => match.index !== -1)
			.sort((a, b) => a.index - b.index);

		const segments: AnswerSegment[] = [];
		let cursor = 0;
		for (const { link, index } of matches) {
			if (index < cursor) continue; // überlappender/duplizierter Treffer, überspringen
			if (index > cursor) {
				segments.push({ text: answer.slice(cursor, index) });
			}
			segments.push({
				text: link.text,
				href: link.href,
				external: /^https?:\/\//.test(link.href)
			});
			cursor = index + link.text.length;
		}
		if (cursor < answer.length) {
			segments.push({ text: answer.slice(cursor) });
		}
		return segments;
	}
</script>

<!--
	<details>/<summary> statt Accordion-JS: Inhalt steht vollständig und
	unbedingt im DOM (kein "erst nach Klick sichtbar"), damit Suchmaschinen-
	und LLM-Crawler jede Antwort ohne Interaktion lesen können.
-->
<div class="divide-y divide-border border-t border-border">
	{#each items as item (item.question)}
		<div class="py-5">
			<details class="group">
				<summary
					class="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold text-text marker:content-none"
				>
					<span>{item.question}</span>
					<span
						class="shrink-0 text-xl leading-none text-muted transition-transform group-open:rotate-45"
						aria-hidden="true">+</span
					>
				</summary>
				<p class="mt-3 max-w-[80ch] leading-relaxed text-muted">
					{#each splitAnswer(item.answer, item.links) as segment, i (i)}
						{#if segment.href && segment.external}
							<a
								class="text-primary underline"
								href={segment.href}
								target="_blank"
								rel="noopener noreferrer">{segment.text}</a
							>
						{:else if segment.href}
							<a class="text-primary underline" href={resolveInternalHref(segment.href)}
								>{segment.text}</a
							>
						{:else}
							{segment.text}
						{/if}
					{/each}
				</p>
			</details>
		</div>
	{/each}
</div>
