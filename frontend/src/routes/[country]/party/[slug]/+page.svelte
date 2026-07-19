<script lang="ts">
	import { jsonLdScriptTag } from '$lib/seo.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
	let event = $derived(data.event);
</script>

<svelte:head>
	<title>{event.title} — dorfpartys.com</title>
	<meta name="robots" content="index,follow" />
	{@html jsonLdScriptTag(event.jsonLd)}
	{@html jsonLdScriptTag(event.breadcrumbJsonLd)}
</svelte:head>

<article style={`--event-color: ${event.customColor}`}>
	<h1>{event.title}</h1>
	<p>
		{new Date(event.startDate).toLocaleString('de-DE')} – {new Date(event.endDate).toLocaleString(
			'de-DE'
		)}
	</p>
	<p>{event.addressDescription}</p>

	<p>{event.description}</p>

	{#if event.priceInfo}
		<p>Preis: {event.priceInfo}</p>
	{/if}
	{#if event.minAge}
		<p>Mindestalter: {event.minAge}</p>
	{/if}
	{#if event.requiresMuttizettel}
		<p>Muttizettel erforderlich</p>
	{/if}
	{#if event.isOutdoor}
		<p>Open Air</p>
	{/if}

	{#if event.photos.length > 0}
		<ul>
			{#each event.photos as photo (photo.id)}
				<li><img src={photo.url} alt={event.title} width="320" /></li>
			{/each}
		</ul>
	{/if}

	{#if event.links.length > 0}
		<ul>
			{#each event.links as link (link.id)}
				<li><a href={link.url}>{link.label}</a></li>
			{/each}
		</ul>
	{/if}

	<p>Veranstalter: {event.organizerName}</p>
</article>
