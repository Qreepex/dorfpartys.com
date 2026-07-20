<script lang="ts">
	import type { FaqEntry } from '$lib/seo.js';

	interface Props {
		items: FaqEntry[];
	}

	let { items }: Props = $props();
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
				<p class="mt-3 max-w-[80ch] leading-relaxed text-muted">{item.answer}</p>
			</details>
		</div>
	{/each}
</div>
