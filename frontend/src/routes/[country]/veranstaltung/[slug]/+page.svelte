<script lang="ts">
	import { resolve } from '$app/paths';
	import { Breadcrumbs, VerifiedBadge } from '$lib/components/index.js';
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

	function segmentsPath(...slugs: Array<string | null | undefined>) {
		return slugs.filter((s): s is string => Boolean(s)).join('/');
	}

	const breadcrumbItems = $derived([
		{
			name: country.toUpperCase(),
			href: countryRootHref
		},
		...(event.bundeslandSlug && event.bundeslandName
			? [
					{
						name: event.bundeslandName,
						href: resolve('/[country]/[...segments]', {
							country,
							segments: segmentsPath(event.bundeslandSlug)
						})
					}
				]
			: []),
		...(event.kreisSlug && event.kreisName
			? [
					{
						name: event.kreisName,
						href: resolve('/[country]/[...segments]', {
							country,
							segments: segmentsPath(event.bundeslandSlug, event.kreisSlug)
						})
					}
				]
			: []),
		...(event.partyArtSlug && event.partyArtName
			? [
					{
						name: event.partyArtName,
						href: resolve('/[country]/[...segments]', {
							country,
							segments: segmentsPath(event.bundeslandSlug, event.kreisSlug, event.partyArtSlug)
						})
					}
				]
			: []),
		{
			name: event.title,
			href: resolve('/[country]/veranstaltung/[slug]', { country, slug: event.slug ?? '' })
		}
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

<main class="mx-auto max-w-[90ch]">
	<Breadcrumbs items={breadcrumbItems} />

	<article class="mt" style={`--event-color: ${event.customColor}`}>
		<div class="flex items-start justify-between gap-4">
			<div>
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
				<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">Preis</dt>
				<dd class="mt-0.5 font-semibold">{event.priceInfo}</dd>
			{/if}
			{#if event.minAge}
				<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">Mindestalter</dt>
				<dd class="mt-0.5 font-semibold">{event.minAge} Jahre</dd>
			{/if}
			{#if event.allowsMuttizettel}
				<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">Muttizettel</dt>
				<dd class="mt-0.5 font-semibold">erforderlich</dd>
			{/if}
			{#if event.isOutdoor}
				<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">Location</dt>
				<dd class="mt-0.5 font-semibold">Open Air</dd>
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

		<p class="flex items-center gap-2 text-muted">
			Veranstalter:
			{#if organizerHref}
				<a class="text-primary no-underline" href={organizerHref}>{event.organizerName}</a>
			{:else}
				{event.organizerName}
			{/if}
			{#if event.organizerVerified}
				<VerifiedBadge title="Von einem verifizierten Veranstalter" />
			{/if}
		</p>
	</article>
</main>
