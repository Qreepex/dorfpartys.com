<script lang="ts">
	import { resolve } from '$app/paths';
	import { Breadcrumbs, EventList } from '$lib/components/index.js';
	import NavTree from '$lib/components/NavTree.svelte';
	import { jsonLdScriptTag, robotsContent } from '$lib/seo.js';
	import {
		MONTHS,
		SITE_URL,
		buildEventUrl,
		buildFilterUrl,
		type Country
	} from '@dorfpartys/shared';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
	let outcome = $derived(data.outcome);
	let result = $derived(outcome.kind === 'result' ? outcome : null);

	const canonical = $derived(
		result ? `${SITE_URL}${buildFilterUrl(result.filters.country, result.filters)}` : ''
	);

	// Gruppiere Events nach Monat + Archiv-Status für semantische H2-Überschriften
	const eventsByMonth = $derived.by(() => {
		if (!result)
			return {
				future: [],
				archive: []
			};

		const now = new Date();
		const futureGroups: Record<string, typeof result.results> = {};
		const archiveGroups: Record<string, typeof result.results> = {};

		for (const event of result.results) {
			const startDate = new Date(event.startDate);
			const isArchive = startDate < now;
			const monthNum = startDate.getMonth();
			const month = MONTHS[monthNum];
			const monthKey = month.slug;

			const target = isArchive ? archiveGroups : futureGroups;
			if (!target[monthKey]) {
				target[monthKey] = [];
			}
			target[monthKey].push(event);
		}

		return {
			future: Object.entries(futureGroups).map(([slug, events]) => [slug, events] as const),
			archive: Object.entries(archiveGroups).map(([slug, events]) => [slug, events] as const)
		};
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

<Breadcrumbs items={breadcrumbs} />

{#if result}
	<div class="grid grid-cols-1 gap-6 md:grid-cols-[1fr_min(90ch,100%)_1fr] md:items-start">
		<!-- Navigation Tree Sidebar -->
		<div class="md:justify-self-end">
			<NavTree {result} />
		</div>

		<!-- Main Content -->
		<main class="md:col-start-2">
			<header class="mb-8">
				<h1>{result.seo.h1}</h1>
				<p class="mt-2 max-w-[60ch] text-muted">{result.seo.intro}</p>
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
			{#if eventsByMonth.future.length > 0 || eventsByMonth.archive.length > 0}
				<nav class="mb-8 flex flex-wrap gap-2" aria-label="Monatlicher Filter">
					{#each MONTHS as month (month.slug)}
						{@const hasFuture = eventsByMonth.future.some(([slug]) => slug === month.slug)}
						{@const hasArchive = eventsByMonth.archive.some(([slug]) => slug === month.slug)}
						{#if hasFuture || hasArchive}
							<a
								href="#{month.slug}"
								class="hover:bg-accent inline-block rounded-full border border-border px-3 py-1 text-sm transition-colors"
							>
								{month.name}
							</a>
						{/if}
					{/each}
				</nav>
			{/if}

			<!-- Future Events -->
			<section aria-label="Kommende Veranstaltungen">
				{#each eventsByMonth.future as [monthSlug, events] (monthSlug)}
					<div class="mb-12">
						<h2 id={monthSlug} class="mb-4 text-xl font-semibold">
							{MONTHS.find((m) => m.slug === monthSlug)?.name || monthSlug}
						</h2>
						<EventList events={[...events]} country={result.filters.country} />
					</div>
				{/each}
			</section>

			<!-- Archive Section -->
			{#if eventsByMonth.archive.length > 0}
				<section class="mt-16 border-t pt-8" aria-label="Archivierte Veranstaltungen">
					<h2 class="mb-6 text-lg font-semibold text-muted">Archiv (letzte 12 Monate)</h2>
					{#each eventsByMonth.archive as [monthSlug, events] (monthSlug)}
						<div class="mb-8">
							<h3 class="mb-3 text-sm font-medium text-muted">
								{(() => {
									const event = events[0];
									if (!event) return monthSlug;
									const startDate = new Date(event.startDate);
									const year = startDate.getFullYear();
									const month = MONTHS.find((m) => m.slug === monthSlug);
									return `${month?.name || monthSlug} ${year}`;
								})()}
							</h3>
							<EventList events={[...events]} country={result.filters.country} />
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
		</main>
	</div>
{/if}
