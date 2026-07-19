<script lang="ts">
	import { EventList } from '$lib/components/index.js';
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
			: `${displayName} auf dorfpartys.com — ${upcoming.length} kommende Veranstaltung${upcoming.length === 1 ? '' : 'en'}. Kostenlos, werbefrei, DACH-weit.`
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
	<title>{displayName} — Veranstalter auf dorfpartys.com</title>
	<meta name="description" content={metaDescription} />
	<meta name="robots" content="index,follow" />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="profile" />
	<meta property="og:title" content={`${displayName} — Veranstalter auf dorfpartys.com`} />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:url" content={canonical} />
	{#if profile.avatarUrl}
		<meta property="og:image" content={profile.avatarUrl} />
	{/if}
	{@html jsonLdScriptTag(jsonLd)}
</svelte:head>

<article class="profile">
	<header class="profile-header">
		{#if profile.avatarUrl}
			<img class="avatar" src={profile.avatarUrl} alt={displayName} width="96" height="96" />
		{/if}
		<div>
			<p class="eyebrow">Veranstalter</p>
			<h1>{displayName}</h1>
		</div>
	</header>

	{#if profile.bio}
		<p class="bio">{profile.bio}</p>
	{/if}

	{#if profile.websiteUrl || profile.instagramUrl || links.length > 0}
		<ul class="links">
			{#if profile.websiteUrl}
				<li>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- externe, selbst gepflegte URL, kein interner Route -->
					<a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer ugc">Website</a>
				</li>
			{/if}
			{#if profile.instagramUrl}
				<li>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- externe, selbst gepflegte URL, kein interner Route -->
					<a href={profile.instagramUrl} target="_blank" rel="noopener noreferrer ugc">Instagram</a>
				</li>
			{/if}
			{#each links as link (link.id)}
				<li>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- externe, selbst gepflegte URL, kein interner Route -->
					<a href={link.url} target="_blank" rel="noopener noreferrer ugc">{link.label}</a>
				</li>
			{/each}
		</ul>
	{/if}

	<section>
		<h2>Kommende Veranstaltungen</h2>
		{#if upcoming.length === 0}
			<p class="empty">Aktuell sind keine kommenden Termine eingetragen.</p>
		{:else}
			<EventList events={upcoming} country={upcoming[0].country} />
		{/if}
	</section>

	{#if past.length > 0}
		<section>
			<h2>Vergangene Veranstaltungen</h2>
			<EventList events={past} country={past[0].country} />
		</section>
	{/if}
</article>

<style>
	.profile-header {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-bottom: 8px;
	}

	.avatar {
		border-radius: 50%;
		object-fit: cover;
		width: 96px;
		height: 96px;
	}

	.eyebrow {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-muted);
		margin: 0 0 4px;
	}

	.profile-header h1 {
		margin: 0;
	}

	.bio {
		max-width: 60ch;
		color: var(--color-muted);
		line-height: 1.6;
	}

	.links {
		list-style: none;
		padding: 0;
		margin: 0 0 32px;
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

	section {
		margin-top: 40px;
	}

	section h2 {
		font-size: 1.3rem;
	}

	.empty {
		color: var(--color-muted);
	}
</style>
