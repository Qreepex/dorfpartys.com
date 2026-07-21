<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button, EventList, ShareButton, VerifiedBadge } from '$lib/components/index.js';
	import { jsonLdScriptTag } from '$lib/seo.js';
	import { SITE_URL, buildOrganizerUrl } from '@dorfpartys/shared';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let profile = $derived(data.profile);
	let links = $derived(data.links);
	let upcoming = $derived(data.upcoming);
	let past = $derived(data.past);

	const loginHref = $derived(
		resolve(`/auth/login?redirectTo=${encodeURIComponent(page.url.pathname)}`)
	);
	let showClaimForm = $state(false);
	let claimReason = $state('');

	const displayName = $derived(profile.displayName ?? 'Veranstalter');
	const canonical = $derived(`${SITE_URL}${buildOrganizerUrl(profile.slug ?? '')}`);
	const metaDescription = $derived(
		profile.bio
			? profile.bio.slice(0, 155)
			: `${displayName} auf dorfpartys.com - ${upcoming.length} kommende Veranstaltung${upcoming.length === 1 ? '' : 'en'}. Kostenlos, werbefrei, DACH-weit.`
	);

	// `sameAs` behauptet nur "diese externen Profile sind derselbe Veranstalter",
	// NICHT dass sie die offizielle Seite dieses Profils sind - `url` bleibt
	// die eigene kanonische dorfpartys.com-URL (s.o.). Quelle: website/instagram/
	// facebook/tiktok aus dem Profil (`user_profile`) plus frei gepflegte
	// `user_link`-Einträge, dedupliziert.
	const sameAs = $derived(
		Array.from(
			new Set(
				[
					profile.websiteUrl,
					profile.instagramUrl,
					profile.facebookUrl,
					profile.tiktokUrl,
					...links.map((l) => l.url)
				].filter((url): url is string => !!url)
			)
		)
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
			...(sameAs.length > 0 ? { sameAs } : {})
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
	<header class="mb-2 flex items-start justify-between gap-4">
		<div class="flex items-center gap-4">
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
		</div>
		<ShareButton title={`${displayName} - Veranstalter auf dorfpartys.com`} />
	</header>

	{#if profile.bio}
		<p class="max-w-[60ch] leading-relaxed text-muted">{profile.bio}</p>
	{/if}

	{#if profile.isGhost}
		<div class="mb-8 max-w-[50ch] border border-border p-4">
			<p class="mb-2 font-semibold">Gehört dieses Profil zu dir?</p>
			<p class="mb-3 text-sm text-muted">
				Dieser Veranstalter wurde von jemand anderem angelegt und ist noch nicht registriert. Als
				verifizierter Veranstalter kannst du das Profil beanspruchen - alle Veranstaltungen werden
				dann auf deinen Account übertragen.
			</p>

			{#if form?.claimed || data.claimStatus === 'pending'}
				<p class="text-sm text-text">
					Deine Anfrage zur Übernahme dieses Profils wurde gesendet und wird geprüft.
				</p>
			{:else if !data.currentUserId}
				<Button href={loginHref}>Einloggen, um dieses Profil zu beanspruchen</Button>
			{:else if !data.ownVerified}
				<p class="text-sm text-text">
					Verifiziere zuerst deinen eigenen Account, um Profile beanspruchen zu können.
					<a href={resolve('/profil')} class="text-primary hover:underline">Jetzt verifizieren →</a>
				</p>
			{:else if !showClaimForm}
				<Button variant="secondary" onclick={() => (showClaimForm = true)}>
					Profil beanspruchen
				</Button>
			{:else}
				<form method="POST" action="?/claimAccount">
					<input type="hidden" name="ghostUserId" value={profile.userId} />
					<label class="field-label" for="claim-account-reason"
						>Warum sollte dieses Profil dir gehören? (optional)</label
					>
					<textarea
						id="claim-account-reason"
						name="reason"
						class="field-control mt-2 w-full"
						rows="3"
						maxlength="1000"
						bind:value={claimReason}></textarea>
					{#if form?.claimError}
						<p class="mt-2 text-[0.85rem] text-secondary">{form.claimError}</p>
					{/if}
					<div class="mt-3 flex gap-2">
						<Button type="submit">Anfrage senden</Button>
						<Button type="button" variant="ghost" onclick={() => (showClaimForm = false)}
							>Abbrechen</Button
						>
					</div>
				</form>
			{/if}
		</div>
	{/if}

	{#if profile.websiteUrl || profile.instagramUrl || links.length > 0}
		<ul class="mb-8 flex flex-wrap gap-3">
			{#if profile.websiteUrl}
				<li>
					<!-- `rel="external"` markiert die URL bewusst als externes, selbst
					     gepflegtes Ziel (kein interner Route, daher kein resolve() nötig) -
					     vom `hasRelExternal`-Check der svelte/no-navigation-without-resolve-Regel erkannt. -->
					<a
						class="inline-block border border-border px-3.5 py-2 text-text no-underline hover:border-primary hover:text-primary"
						href={profile.websiteUrl}
						target="_blank"
						rel="external noopener noreferrer ugc">Website</a
					>
				</li>
			{/if}
			{#if profile.instagramUrl}
				<li>
					<!-- rel="external", s.o. -->
					<a
						class="inline-block border border-border px-3.5 py-2 text-text no-underline hover:border-primary hover:text-primary"
						href={profile.instagramUrl}
						target="_blank"
						rel="external noopener noreferrer ugc">Instagram</a
					>
				</li>
			{/if}
			{#each links as link (link.id)}
				<li>
					<!-- rel="external", s.o. -->
					<a
						class="inline-block border border-border px-3.5 py-2 text-text no-underline hover:border-primary hover:text-primary"
						href={link.url}
						target="_blank"
						rel="external noopener noreferrer ugc">{link.label}</a
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

	<div class="notice mt-12">
		{#if profile.verifiedAt}
			Offizielles Veranstalter-Profil auf dorfpartys.com. Dieser Eintrag wird direkt von {displayName}
			verwaltet.
		{:else}
			Dies ist ein unabhängiger Verzeichniseintrag auf dorfpartys.com. Wir stehen in keiner
			geschäftlichen Verbindung oder offiziellen Partnerschaft mit {displayName}. Alle genannten
			Namen und Marken sind Eigentum des jeweiligen Inhabers.
		{/if}
	</div>
</main>
