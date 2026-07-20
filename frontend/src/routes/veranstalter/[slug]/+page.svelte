<script lang="ts">
	import { EventList, VerifiedBadge } from '$lib/components/index.js';
	import { jsonLdScriptTag } from '$lib/seo.js';
	import { SITE_URL, buildOrganizerUrl } from '@dorfpartys/shared';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
	let profile = $derived(data.profile);
	let links = $derived(data.links);
	let upcoming = $derived(data.upcoming);
	let past = $derived(data.past);

	const displayName = $derived(profile.displayName ?? 'Veranstalter');
	const canonical = $derived(`${SITE_URL}${buildOrganizerUrl(profile.slug ?? '')}`);
	const metaDescription = $derived(
		profile.bio
			? profile.bio.slice(0, 155)
			: `${displayName} auf dorfpartys.com - ${upcoming.length} kommende Veranstaltung${upcoming.length === 1 ? '' : 'en'}. Kostenlos, werbefrei, DACH-weit.`
	);

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'ProfilePage',
		mainEntity: {
			'@type': 'Organization',
			name: displayName,
			description: profile.bio ?? undefined,
			image: profile.avatarUrl ?? undefined,
			url: canonical,
			sameAs: [profile.websiteUrl, profile.instagramUrl, ...links.map((l) => l.url)].filter(Boolean)
		}
	});
</script>

<svelte:head>
	<title>{displayName} - Veranstalter auf dorfpartys.com</title>
	<meta name="description" content={metaDescription} />
	<meta name="robots" content="index,follow" />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="profile" />
	<meta property="og:title" content={`${displayName} - Veranstalter auf dorfpartys.com`} />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:url" content={canonical} />
	{#if profile.avatarUrl}
		<meta property="og:image" content={profile.avatarUrl} />
	{/if}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdScriptTag(jsonLd)}
</svelte:head>

<main class="mx-auto max-w-[90ch]">
	<header class="mb-2 flex items-center gap-4">
		{#if profile.avatarUrl}
			<img
				class="h-24 w-24 rounded-full object-cover"
				src={profile.avatarUrl}
				alt={displayName}
				width="96"
				height="96"
			/>
		{/if}
		<div>
			<p class="mb-1 text-[0.75rem] tracking-[0.08em] text-muted uppercase">Veranstalter</p>
			<h1 class="m-0 flex items-center gap-2">
				{displayName}
				{#if profile.verifiedAt}
					<VerifiedBadge title="Verifizierter Veranstalter" />
				{/if}
			</h1>
		</div>
	</header>

	{#if profile.bio}
		<p class="max-w-[60ch] leading-relaxed text-muted">{profile.bio}</p>
	{/if}

	{#if profile.websiteUrl || profile.instagramUrl || links.length > 0}
		<ul class="mb-8 flex flex-wrap gap-3">
			{#if profile.websiteUrl}
				<li>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- externe, selbst gepflegte URL, kein interner Route -->
					<a
						class="inline-block border border-border px-3.5 py-2 text-text no-underline hover:border-primary hover:text-primary"
						href={profile.websiteUrl}
						target="_blank"
						rel="noopener noreferrer ugc">Website</a
					>
				</li>
			{/if}
			{#if profile.instagramUrl}
				<li>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- externe, selbst gepflegte URL, kein interner Route -->
					<a
						class="inline-block border border-border px-3.5 py-2 text-text no-underline hover:border-primary hover:text-primary"
						href={profile.instagramUrl}
						target="_blank"
						rel="noopener noreferrer ugc">Instagram</a
					>
				</li>
			{/if}
			{#each links as link (link.id)}
				<li>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- externe, selbst gepflegte URL, kein interner Route -->
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

	<section class="mt-10">
		<h2>Kommende Veranstaltungen</h2>
		{#if upcoming.length === 0}
			<p class="text-muted">Aktuell sind keine kommenden Termine eingetragen.</p>
		{:else}
			<EventList events={upcoming} country={upcoming[0].country} />
		{/if}
	</section>

	{#if past.length > 0}
		<section class="mt-10">
			<h2>Vergangene Veranstaltungen</h2>
			<EventList events={past} country={past[0].country} />
		</section>
	{/if}
</main>
