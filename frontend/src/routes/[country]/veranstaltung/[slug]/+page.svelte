<script lang="ts">
	import { resolve } from '$app/paths';
	import { Breadcrumbs } from '$lib/components/index.js';
	import { jsonLdScriptTag } from '$lib/seo.js';
	import { SITE_URL, buildEventUrl } from '@dorfpartys/shared';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
	let event = $derived(data.event);
	let country = $derived(data.country);

	const canonical = $derived(`${SITE_URL}${buildEventUrl(country, event.slug ?? '')}`);
	const countryRootHref = $derived(resolve('/[country]/[...segments]', { country, segments: '' }));
	const organizerHref = $derived(
		event.organizerSlug ? resolve('/veranstalter/[slug]', { slug: event.organizerSlug }) : null
	);
	const breadcrumbItems = $derived([
		{
			name: event.breadcrumbJsonLd.itemListElement[0]?.name ?? country.toUpperCase(),
			href: countryRootHref
		},
		{ name: event.title, href: canonical }
	]);
	const metaDescription = $derived(
		`${event.title} - ${new Date(event.startDate).toLocaleDateString('de-DE', {
			day: '2-digit',
			month: 'long',
			year: 'numeric'
		})} in ${event.addressDescription}. ${event.description.slice(0, 130)}${event.description.length > 130 ? '…' : ''}`
	);
	const ogImage = $derived(event.photos[0]?.url);
</script>

<svelte:head>
	<title>{event.title} | dorfpartys.com</title>
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
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdScriptTag(event.jsonLd)}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdScriptTag(event.breadcrumbJsonLd)}
</svelte:head>

<Breadcrumbs items={breadcrumbItems} />

<article class="max-w-[68ch]" style={`--event-color: ${event.customColor}`}>
	<div class="flex items-start justify-between gap-4">
		<div>
			<p
				class="mb-2 inline-block border-l-[3px] pl-2 text-[0.75rem] tracking-[0.08em] text-muted uppercase"
				style="border-color: var(--event-color, var(--color-secondary))"
			>
				{event.partyArtName}
			</p>
			<h1>{event.title}</h1>
		</div>
		<form method="POST" action="?/toggleSave">
			<input type="hidden" name="eventId" value={event.id} />
			<input type="hidden" name="isSaved" value={event.isSaved} />
			<button
				type="submit"
				class="flex min-h-11 shrink-0 items-center gap-1.5 border border-border bg-transparent px-4 font-body text-[0.85rem] font-semibold text-text hover:border-primary hover:text-primary"
				class:bg-primary={event.isSaved}
				class:border-primary={event.isSaved}
				class:text-ink={event.isSaved}
				aria-pressed={event.isSaved}
			>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill={event.isSaved ? 'currentColor' : 'none'}
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
				</svg>
				{event.isSaved ? 'Gemerkt' : 'Merken'}
			</button>
		</form>
	</div>
	<p class="font-semibold">
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
	<p class="mt-0 text-muted">{event.addressDescription}</p>

	{#if event.photos.length > 0}
		<div class="my-6 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
			{#each event.photos as photo (photo.id)}
				<img
					class="aspect-4/3 w-full object-cover"
					src={photo.url}
					alt={event.title}
					loading="lazy"
				/>
			{/each}
		</div>
	{/if}

	<p class="leading-relaxed whitespace-pre-line">{event.description}</p>

	<dl
		class="my-6 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 border-y border-border py-4"
	>
		{#if event.priceInfo}
			<div>
				<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">Preis</dt>
				<dd class="mt-0.5 font-semibold">{event.priceInfo}</dd>
			</div>
		{/if}
		{#if event.minAge}
			<div>
				<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">Mindestalter</dt>
				<dd class="mt-0.5 font-semibold">{event.minAge} Jahre</dd>
			</div>
		{/if}
		{#if event.allowsMuttizettel}
			<div>
				<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">Muttizettel</dt>
				<dd class="mt-0.5 font-semibold">erforderlich</dd>
			</div>
		{/if}
		{#if event.isOutdoor}
			<div>
				<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">Location</dt>
				<dd class="mt-0.5 font-semibold">Open Air</dd>
			</div>
		{/if}
	</dl>

	{#if event.links.length > 0}
		<ul class="mb-6 flex flex-wrap gap-3">
			{#each event.links as link (link.id)}
				<li>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- externe, vom Veranstalter gepflegte URL, kein interner Route -->
					<a
						class="inline-block border border-border px-3.5 py-2 text-text no-underline hover:border-primary hover:text-primary"
						href={link.url}
						target="_blank"
						rel="noopener noreferrer ugc">{link.label}</a
					>
				</li>
			{/each}
		</ul>
	{/if}

	<p class="text-muted">
		Veranstalter:
		{#if organizerHref}
			<a class="text-primary no-underline" href={organizerHref}>{event.organizerName}</a>
		{:else}
			{event.organizerName}
		{/if}
	</p>
</article>
