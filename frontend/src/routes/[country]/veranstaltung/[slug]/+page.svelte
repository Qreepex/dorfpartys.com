<script lang="ts">
	import { resolve } from '$app/paths';
	import { jsonLdScriptTag } from '$lib/seo.js';
	import { SITE_URL, buildEventUrl } from '@dorfpartys/shared';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
	let event = $derived(data.event);
	let country = $derived(data.country);

	const canonical = $derived(`${SITE_URL}${buildEventUrl(country, event.slug ?? '')}`);
	const countryRootHref = $derived(
		resolve('/[country]/[...segments]', { country, segments: '' })
	);
	const organizerHref = $derived(
		event.organizerSlug ? resolve('/veranstalter/[slug]', { slug: event.organizerSlug }) : null
	);
	const metaDescription = $derived(
		`${event.title} — ${new Date(event.startDate).toLocaleDateString('de-DE', {
			day: '2-digit',
			month: 'long',
			year: 'numeric'
		})} in ${event.addressDescription}. ${event.description.slice(0, 130)}${event.description.length > 130 ? '…' : ''}`
	);
	const ogImage = $derived(event.photos[0]?.url);
</script>

<svelte:head>
	<title>{event.title} — dorfpartys.com</title>
	<meta name="description" content={metaDescription} />
	<meta name="robots" content="index,follow" />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={event.title} />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:url" content={canonical} />
	{#if ogImage}
		<meta property="og:image" content={ogImage} />
		<meta name="twitter:card" content="summary_large_image" />
	{:else}
		<meta name="twitter:card" content="summary" />
	{/if}
	{@html jsonLdScriptTag(event.jsonLd)}
	{@html jsonLdScriptTag(event.breadcrumbJsonLd)}
</svelte:head>

<nav class="breadcrumbs" aria-label="Breadcrumb">
	<a href={countryRootHref}>{event.breadcrumbJsonLd.itemListElement[0]?.name}</a>
	<span class="sep">/</span>
	<span aria-current="page">{event.title}</span>
</nav>

<article class="event" style={`--event-color: ${event.customColor}`}>
	<div class="title-row">
		<div>
			<p class="tag">{event.partyArtName}</p>
			<h1>{event.title}</h1>
		</div>
		<form method="POST" action="?/toggleSave">
			<input type="hidden" name="eventId" value={event.id} />
			<input type="hidden" name="isSaved" value={event.isSaved} />
			<button type="submit" class="save-toggle" class:saved={event.isSaved} aria-pressed={event.isSaved}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill={event.isSaved ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
					<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
				</svg>
				{event.isSaved ? 'Gemerkt' : 'Merken'}
			</button>
		</form>
	</div>
	<p class="datetime">
		{new Date(event.startDate).toLocaleString('de-DE', {
			weekday: 'long',
			day: '2-digit',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})}
		– {new Date(event.endDate).toLocaleString('de-DE', {
			day: '2-digit',
			month: 'long',
			hour: '2-digit',
			minute: '2-digit'
		})}
	</p>
	<p class="address">{event.addressDescription}</p>

	{#if event.photos.length > 0}
		<div class="photos">
			{#each event.photos as photo (photo.id)}
				<img src={photo.url} alt={event.title} loading="lazy" />
			{/each}
		</div>
	{/if}

	<p class="description">{event.description}</p>

	<dl class="facts">
		{#if event.priceInfo}
			<div><dt>Preis</dt><dd>{event.priceInfo}</dd></div>
		{/if}
		{#if event.minAge}
			<div><dt>Mindestalter</dt><dd>{event.minAge} Jahre</dd></div>
		{/if}
		{#if event.allowsMuttizettel}
			<div><dt>Muttizettel</dt><dd>erforderlich</dd></div>
		{/if}
		{#if event.isOutdoor}
			<div><dt>Location</dt><dd>Open Air</dd></div>
		{/if}
	</dl>

	{#if event.links.length > 0}
		<ul class="links">
			{#each event.links as link (link.id)}
				<li>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- externe, vom Veranstalter gepflegte URL, kein interner Route -->
					<a href={link.url} target="_blank" rel="noopener noreferrer ugc">{link.label}</a>
				</li>
			{/each}
		</ul>
	{/if}

	<p class="organizer">
		Veranstalter:
		{#if organizerHref}
			<a href={organizerHref}>{event.organizerName}</a>
		{:else}
			{event.organizerName}
		{/if}
	</p>
</article>

<style>
	.breadcrumbs {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin-bottom: 24px;
	}
	.breadcrumbs a {
		color: var(--color-text-muted);
		text-decoration: none;
	}
	.breadcrumbs a:hover {
		color: var(--color-primary);
	}
	.breadcrumbs .sep {
		margin: 0 6px;
	}

	.event {
		max-width: 68ch;
	}

	.title-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}

	.save-toggle {
		flex: 0 0 auto;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
		padding: 0 16px;
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text);
		font-family: 'Inter', system-ui, sans-serif;
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.save-toggle:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.save-toggle.saved {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-ink);
	}

	.tag {
		display: inline-block;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		border-left: 3px solid var(--event-color, var(--color-secondary));
		padding-left: 8px;
		color: var(--color-text-muted);
		margin: 0 0 8px;
	}

	.event h1 {
		font-size: clamp(1.8rem, 5vw, 2.8rem);
		margin-bottom: 8px;
	}

	.datetime {
		font-weight: 600;
	}

	.address {
		color: var(--color-text-muted);
		margin-top: 0;
	}

	.photos {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 8px;
		margin: 24px 0;
	}

	.photos img {
		width: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
	}

	.description {
		white-space: pre-line;
		line-height: 1.6;
	}

	.facts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 12px;
		margin: 24px 0;
		padding: 16px 0;
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
	}

	.facts dt {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
	}

	.facts dd {
		margin: 2px 0 0;
		font-weight: 600;
	}

	.links {
		list-style: none;
		padding: 0;
		margin: 0 0 24px;
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.links a {
		display: inline-block;
		border: 1px solid var(--color-border);
		padding: 8px 14px;
		text-decoration: none;
		color: var(--color-text);
	}

	.links a:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.organizer {
		color: var(--color-text-muted);
	}

	.organizer a {
		color: var(--color-primary);
		text-decoration: none;
	}
</style>
