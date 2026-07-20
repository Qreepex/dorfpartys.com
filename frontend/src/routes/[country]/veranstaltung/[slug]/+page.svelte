<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Breadcrumbs, LegalDisclaimer, LinkTypeIcon, VerifiedBadge } from '$lib/components/index.js';
	import { jsonLdScriptTag } from '$lib/seo.js';
	import { SITE_URL, buildEventUrl, detectEventLinkType } from '@dorfpartys/shared';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let event = $derived(data.event);
	let country = $derived(data.country);

	const canonical = $derived(`${SITE_URL}${buildEventUrl(country, event.slug ?? '')}`);
	const countryRootHref = $derived(resolve('/[country]/[...segments]', { country, segments: '' }));
	const organizerHref = $derived(
		event.organizerSlug ? resolve('/veranstalter/[slug]', { slug: event.organizerSlug }) : null
	);

	const isOrganizer = $derived(
		!!data.currentUserId && data.currentUserId === event.organizerUserId
	);
	const canClaim = $derived(!event.organizerVerified && !isOrganizer);
	const editHref = $derived(
		`${resolve('/veranstaltung-eintragen')}?eventId=${encodeURIComponent(event.id)}`
	);
	const loginHref = $derived(
		`${resolve('/auth/login')}?redirectTo=${encodeURIComponent(page.url.pathname)}`
	);

	let showClaimForm = $state(false);
	let claimReason = $state('');

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
		})} in ${event.addressDescription}.` +
			(event.description
				? ` ${event.description.slice(0, 130)}${event.description.length > 130 ? '…' : ''}`
				: '')
	);
	const ogImage = $derived(event.photos[0]?.url);
	// HTML-<title> ergänzt Kreis + Bundesland (z.B. "... in Ostholstein,
	// Schleswig-Holstein"), analog zur Titel-Erweiterung auf Kreis-Filterseiten
	// in backend/src/seo/search-copy.ts.
	const pageTitle = $derived(
		event.kreisName && event.bundeslandName
			? `${event.title} in ${event.kreisName}, ${event.bundeslandName} | dorfpartys.com`
			: `${event.title} | dorfpartys.com`
	);
</script>

<svelte:head>
	<title>{pageTitle}</title>
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

<main
	class="grid grid-cols-1 gap-6 md:grid-cols-[1fr_min(90ch,100%)_1fr] md:items-start"
	style={`--event-color: ${event.customColor}`}
>
	<!--
		Breadcrumbs live in main's column but are widened by exactly the sidebar's
		fixed width + gap, so they span from main's left edge to the sidebar's
		right edge without ever affecting the sidebar's own width. Mirror of the
		[...segments] technique with the sidebar on the right instead of the left.
	-->
	<div class="md:col-start-2 md:row-start-1 md:w-[calc(100%+17.5rem)]">
		<Breadcrumbs items={breadcrumbItems} />
	</div>

	<!-- Main Content -->
	<article class="md:col-start-2 md:row-start-2">
		<div class="flex items-start justify-between gap-4">
			<h1>{event.title}</h1>
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

		{#if event.description}
			<p class="leading-relaxed whitespace-pre-line">{event.description}</p>
		{/if}

		{#if event.links.length > 0}
			<ul class="mb-6 flex flex-wrap gap-3">
				{#each event.links as link (link.id)}
					<li>
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- externe, vom Veranstalter gepflegte URL, kein interner Route -->
						<a
							class="inline-flex items-center gap-2 border border-border px-3.5 py-2 text-text no-underline hover:border-primary hover:text-primary"
							href={link.url}
							target="_blank"
							rel="noopener noreferrer ugc"
						>
							<LinkTypeIcon type={detectEventLinkType(link.url)} />
							{link.label}</a
						>
					</li>
				{/each}
			</ul>
		{/if}

		{#if isOrganizer}
			<a
				href={editHref}
				class="inline-flex min-h-11 items-center gap-2 border border-border px-4 font-body text-[0.85rem] font-semibold text-text no-underline hover:border-primary hover:text-primary"
			>
				Veranstaltung bearbeiten
			</a>
		{:else if canClaim}
			{#if form?.claimed || data.claimStatus === 'pending'}
				<p class="border border-border bg-bg-alt p-4 text-[0.9rem] text-muted">
					Deine Anfrage zur Übernahme dieses Events wurde gesendet und wird geprüft.
				</p>
			{:else if !data.currentUserId}
				<a
					href={loginHref}
					class="inline-flex min-h-11 items-center gap-2 border border-border px-4 font-body text-[0.85rem] font-semibold text-text no-underline hover:border-primary hover:text-primary"
				>
					Einloggen, um dieses Event zu verwalten
				</a>
			{:else if !showClaimForm}
				<button
					type="button"
					class="inline-flex min-h-11 items-center gap-2 border border-border bg-transparent px-4 font-body text-[0.85rem] font-semibold text-text hover:border-primary hover:text-primary"
					onclick={() => (showClaimForm = true)}
				>
					Dieses Event verwalten
				</button>
			{:else}
				<form method="POST" action="?/claimEvent" class="max-w-[50ch] border border-border p-4">
					<input type="hidden" name="eventId" value={event.id} />
					<label class="field-label" for="claim-reason"
						>Warum solltest du dieses Event verwalten? (optional)</label
					>
					<textarea
						id="claim-reason"
						name="reason"
						class="field-control mt-2 w-full"
						rows="3"
						maxlength="1000"
						bind:value={claimReason}></textarea>
					{#if form?.claimError}
						<p class="mt-2 text-[0.85rem] text-secondary">{form.claimError}</p>
					{/if}
					<div class="mt-3 flex gap-2">
						<button
							type="submit"
							class="min-h-11 border border-primary bg-primary px-4 font-body text-[0.85rem] font-semibold text-ink"
						>
							Anfrage senden
						</button>
						<button
							type="button"
							class="min-h-11 border border-border bg-transparent px-4 font-body text-[0.85rem] font-semibold text-text"
							onclick={() => (showClaimForm = false)}
						>
							Abbrechen
						</button>
					</div>
				</form>
			{/if}
		{/if}

		<LegalDisclaimer />
	</article>

	<!-- Sidebar -->
	<aside class="flex flex-col gap-4 md:col-start-3 md:row-start-2 md:w-64 md:justify-self-start">
		<div class="bg-card border border-border p-4">
			<h2 class="mb-3 text-[0.95rem] font-semibold">Details</h2>
			<dl class="space-y-3 text-[0.9rem]">
				<div>
					<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">Wann</dt>
					<dd class="mt-0.5 font-semibold">
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
					</dd>
				</div>
				<div>
					<dt class="text-[0.7rem] tracking-[0.08em] text-muted uppercase">Wo</dt>
					<dd class="mt-0.5 font-semibold">{event.addressDescription}</dd>
				</div>
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
		</div>

		<div class="bg-card border border-border p-4">
			<h2 class="mb-3 text-[0.95rem] font-semibold">Veranstalter</h2>
			<div class="flex items-center gap-3">
				{#if event.organizerAvatarUrl}
					<img
						class="h-12 w-12 shrink-0 rounded-full object-cover"
						src={event.organizerAvatarUrl}
						alt={event.organizerName}
						width="48"
						height="48"
					/>
				{:else}
					<div
						class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-bg-alt text-muted"
						aria-hidden="true"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<circle cx="12" cy="8" r="4" />
							<path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
						</svg>
					</div>
				{/if}
				<div class="min-w-0">
					<p class="flex items-center gap-1.5 font-semibold">
						{#if organizerHref}
							<a class="truncate text-text no-underline hover:text-primary" href={organizerHref}
								>{event.organizerName}</a
							>
						{:else}
							<span class="truncate">{event.organizerName}</span>
						{/if}
						{#if event.organizerVerified}
							<VerifiedBadge title="Von einem verifizierten Veranstalter" />
						{/if}
					</p>
					{#if organizerHref}
						<a
							class="text-[0.85rem] text-muted no-underline hover:text-primary"
							href={organizerHref}>Profil ansehen</a
						>
					{/if}
				</div>
			</div>
		</div>
	</aside>
</main>
