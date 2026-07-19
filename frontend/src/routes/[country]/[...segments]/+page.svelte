<script lang="ts">
	import { jsonLdScriptTag, robotsContent } from '$lib/seo.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
	let outcome = $derived(data.outcome);
</script>

<svelte:head>
	<title>dorfpartys.com — Partys finden</title>
	<meta name="robots" content={robotsContent(outcome.indexable)} />
	{@html jsonLdScriptTag(outcome.breadcrumbJsonLd)}
</svelte:head>

<h1>Partys</h1>

<p>{outcome.total} Treffer</p>

{#if outcome.results.length === 0}
	<p>Für diese Auswahl gibt es aktuell keine Einträge.</p>
{:else}
	<ul>
		{#each outcome.results as item (item.slug)}
			<li>
				{#if item.slug}
					<a href={`/${outcome.filters.country}/party/${item.slug}/`}>{item.title}</a>
				{:else}
					{item.title}
				{/if}
				— {new Date(item.startDate).toLocaleDateString('de-DE')}
			</li>
		{/each}
	</ul>
{/if}
