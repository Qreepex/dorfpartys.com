<script lang="ts">
	import { resolve } from '$app/paths';
	import { Breadcrumbs, EventList, LegalDisclaimer } from '$lib/components/index.js';
	import NavTree from '$lib/components/NavTree.svelte';
	import { jsonLdScriptTag, robotsContent } from '$lib/seo.js';
	import {
		SITE_URL,
		buildEventUrl,
		buildFilterUrl,
		monthGroup,
		type Country
	} from '@dorfpartys/shared';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
	let outcome = $derived(data.outcome);
	let result = $derived(outcome.kind === 'result' ? outcome : null);

	const canonical = $derived(
		result ? `${SITE_URL}${buildFilterUrl(result.filters.country, result.filters)}` : ''
	);

	// Gruppiere Events nach Monat (+ Jahr, sobald abweichend vom aktuellen Jahr) + Archiv-Status
	// für semantische H2/H3-Überschriften. Jahr wird angehängt sobald ein Event nicht im
	// aktuellen Kalenderjahr liegt (nicht nur bei tatsächlicher Kollision), siehe monthGroup().
	type MonthBucket = { slug: string; label: string; events: NonNullable<typeof result>['results'] };

	const eventsByMonth = $derived.by(() => {
		if (!result)
			return {
				future: [] as MonthBucket[],
				archive: [] as MonthBucket[]
			};

		const now = new Date();
		const futureGroups = new Map<string, MonthBucket>();
		const archiveGroups = new Map<string, MonthBucket>();

		for (const event of result.results) {
			const startDate = new Date(event.startDate);
			const isArchive = startDate < now;
			const { slug, label } = monthGroup(startDate, now);

			const target = isArchive ? archiveGroups : futureGroups;
			let bucket = target.get(slug);
			if (!bucket) {
				bucket = { slug, label, events: [] };
				target.set(slug, bucket);
			}
			bucket.events.push(event);
		}

		return {
			future: [...futureGroups.values()],
			archive: [...archiveGroups.values()]
		};
	});

	// Ein Badge pro auf der Seite vorhandenem Monat (inkl. Jahres-Suffix bei Bedarf) - verlinkt
	// bevorzugt in die "kommende" Sektion; nur wenn ein Monat ausschließlich im Archiv vorkommt,
	// zeigt der Badge dorthin (Archiv-Überschriften bekommen ein "archiv-"-Präfix in der Id, damit
	// z.B. "August" (kommend) und "August" (archiviert, gleiches Jahr) nie dieselbe Fragment-Id
	// teilen).
	const monthBadges = $derived.by(() => {
		const badges: Array<{ slug: string; label: string; href: string }> = [];
		const seen = new Set<string>();
		for (const bucket of eventsByMonth.future) {
			badges.push({ slug: bucket.slug, label: bucket.label, href: `#${bucket.slug}` });
			seen.add(bucket.slug);
		}
		for (const bucket of eventsByMonth.archive) {
			if (seen.has(bucket.slug)) continue;
			badges.push({ slug: bucket.slug, label: bucket.label, href: `#archiv-${bucket.slug}` });
			seen.add(bucket.slug);
		}
		return badges;
	});

	// ItemList-JSON-LD für alle Events
	const itemListJsonLd = $derived(
		result && result.results.length > 0
			? {
					'@context': 'https://schema.org',
					'@type': 'ItemList',
					itemListElement: result.results.map((item, index) => ({
						'@type': 'ListItem',
						position: index + 1,
						url: item.slug
							? `${SITE_URL}${buildEventUrl(result.filters.country, item.slug)}`
							: undefined,
						name: item.title
					}))
				}
			: null
	);

	const COUNTRY_LABELS: Record<Country, string> = { de: 'DE', at: 'AT', ch: 'CH' };

	function segmentsPath(...slugs: Array<string | null | undefined>) {
		return slugs.filter((s): s is string => Boolean(s)).join('/');
	}

	// Breadcrumbs ohne Monat
	const breadcrumbs = $derived(
		result
			? [
					{
						name: COUNTRY_LABELS[result.filters.country],
						href: resolve('/[country]/[...segments]', {
							country: result.filters.country,
							segments: ''
						})
					},
					...(result.filters.bundeslandSlug
						? [
								{
									name: result.names.bundeslandName ?? result.filters.bundeslandSlug,
									href: resolve('/[country]/[...segments]', {
										country: result.filters.country,
										segments: segmentsPath(result.filters.bundeslandSlug)
									})
								}
							]
						: []),
					...(result.filters.kreisSlug
						? [
								{
									name: result.names.kreisName ?? result.filters.kreisSlug,
									href: resolve('/[country]/[...segments]', {
										country: result.filters.country,
										segments: segmentsPath(result.filters.bundeslandSlug, result.filters.kreisSlug)
									})
								}
							]
						: []),
					...(result.filters.artSlug
						? [
								{
									name: result.names.artName ?? result.filters.artSlug,
									href: resolve('/[country]/[...segments]', {
										country: result.filters.country,
										segments: segmentsPath(
											result.filters.bundeslandSlug,
											result.filters.kreisSlug,
											result.filters.artSlug
										)
									})
								}
							]
						: [])
				]
			: []
	);
</script>

<svelte:head>
	{#if result}
		<title>{result.seo.title}</title>
		<meta name="description" content={result.seo.description} />
		<meta name="robots" content={robotsContent(result.indexable)} />
		<link rel="canonical" href={canonical} />
		<meta property="og:type" content="website" />
		<meta property="og:title" content={result.seo.title} />
		<meta property="og:description" content={result.seo.description} />
		<meta property="og:url" content={canonical} />
		{#if result.ogImageUrl}
			<meta property="og:image" content={result.ogImageUrl} />
			<meta property="og:image:width" content="1200" />
			<meta property="og:image:height" content="630" />
			<meta name="twitter:card" content="summary_large_image" />
		{:else}
			<meta name="twitter:card" content="summary" />
		{/if}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html jsonLdScriptTag(result.breadcrumbJsonLd)}
		{#if itemListJsonLd}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html jsonLdScriptTag(itemListJsonLd)}
		{/if}
	{/if}
</svelte:head>

{#if result}
	<main class="grid grid-cols-1 gap-6 md:grid-cols-[1fr_min(90ch,100%)_1fr] md:items-start">
		<!--
			Breadcrumbs live in main's column but are shifted left by exactly the sidebar's
			fixed width + gap, and widened by the same amount, so they span from the sidebar's
			left edge to main's right edge without ever affecting the sidebar's own width.
		-->
		<div class="md:col-start-2 md:row-start-1 md:-ml-70 md:w-[calc(100%+17.5rem)]">
			<Breadcrumbs items={breadcrumbs} />
		</div>

		<!-- Navigation Tree Sidebar -->
		<div class="md:col-start-1 md:row-start-2 md:w-64 md:justify-self-end">
			<NavTree {result} />
		</div>

		<!-- Main Content -->
		<article class="md:col-start-2 md:row-start-2">
			<header class="mb-8">
				<h1>{result.seo.h1}</h1>
				<p class="mt-2 max-w-[60ch] text-muted">{result.seo.intro}</p>
				{#each result.seo.regionFlavorParagraphs as paragraph, index (index)}
					<p class="mt-2 max-w-[60ch] text-muted">{paragraph}</p>
				{/each}
				<p class="mt-2 text-[0.85rem] text-muted">
					{#if result.futureCount && result.pastCount}
						{result.futureCount} kommend, {result.pastCount} archiviert
					{:else if result.futureCount}
						{result.futureCount} Treffer (kommend)
					{:else if result.pastCount}
						{result.pastCount} Treffer (archiviert)
					{:else}
						{result.total} Treffer
					{/if}
				</p>
			</header>

			<!-- Month badge filter (scrolls to matching section) -->
			{#if monthBadges.length > 0}
				<nav class="mb-8 flex flex-wrap gap-2" aria-label="Monatlicher Filter">
					{#each monthBadges as badge (badge.href)}
						<a
							href={badge.href}
							class="hover:bg-accent inline-block rounded-full border border-border px-3 py-1 text-sm transition-colors"
						>
							{badge.label}
						</a>
					{/each}
				</nav>
			{/if}

			<!-- Future Events -->
			<section aria-label="Kommende Veranstaltungen">
				{#each eventsByMonth.future as bucket (bucket.slug)}
					<div class="mb-12">
						<h2 id={bucket.slug} class="mb-4 text-xl font-semibold">
							{bucket.label}
						</h2>
						<EventList events={[...bucket.events]} country={result.filters.country} />
					</div>
				{/each}
			</section>

			<!-- Archive Section -->
			{#if eventsByMonth.archive.length > 0}
				<section class="mt-16 border-t pt-8" aria-label="Archivierte Veranstaltungen">
					<h2 class="mb-6 text-lg font-semibold text-muted">Archiv (letzte 12 Monate)</h2>
					{#each eventsByMonth.archive as bucket (bucket.slug)}
						<div class="mb-8">
							<h3 id="archiv-{bucket.slug}" class="mb-3 text-sm font-medium text-muted">
								{bucket.label}
							</h3>
							<EventList events={[...bucket.events]} country={result.filters.country} />
						</div>
					{/each}
				</section>
			{/if}

			{#if result.results.length === 0}
				<p class="mt-6 text-muted">
					Kennst du eine Party in der Umgebung?
					<a class="text-primary" href={resolve('/veranstaltung-eintragen')}
						>Trag sie kostenlos ein</a
					>
					- du bist als Erste:r auf dieser Seite gelistet.
				</p>
			{/if}

			<LegalDisclaimer />
		</article>
	</main>
{/if}
