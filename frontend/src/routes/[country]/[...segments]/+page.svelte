<script lang="ts">
	import { resolve } from '$app/paths';
	import { Breadcrumbs, EventList, LegalDisclaimer, ShareButton } from '$lib/components/index.js';
	import NavTree from '$lib/components/NavTree.svelte';
	import { jsonLdScriptTag, robotsContent } from '$lib/seo.js';
	import {
		SITE_URL,
		buildEventUrl,
		buildFilterUrl,
		monthGroup,
		type Country
	} from '@dorfpartys/shared';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
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
	//
	// Dateless Events (startDate = null, AGENTS.md 5 "Quantität über Qualität"):
	// können nicht nach Monat gruppiert werden, landen daher in einer eigenen
	// `dateless`-Liste statt in future/archive - `new Date(null)` würde sonst
	// fälschlich auf den 1.1.1970 (also "archiviert") fallen. Der Backend-Resolver
	// zählt sie bereits zu futureCount (nie archiviert, backend/src/resolver),
	// hier geht es nur um die Platzierung in der Seite selbst.
	type MonthBucket = { slug: string; label: string; events: NonNullable<typeof result>['results'] };

	const eventsByMonth = $derived.by(() => {
		if (!result)
			return {
				future: [] as MonthBucket[],
				archive: [] as MonthBucket[],
				dateless: [] as NonNullable<typeof result>['results']
			};

		const now = new Date();
		const futureGroups = new SvelteMap<string, MonthBucket>();
		const archiveGroups = new SvelteMap<string, MonthBucket>();
		const dateless: NonNullable<typeof result>['results'] = [];

		for (const event of result.results) {
			if (!event.startDate) {
				dateless.push(event);
				continue;
			}
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
			archive: [...archiveGroups.values()],
			dateless
		};
	});

	// Ein Badge pro auf der Seite vorhandenem Monat (inkl. Jahres-Suffix bei Bedarf) - verlinkt
	// bevorzugt in die "kommende" Sektion; nur wenn ein Monat ausschließlich im Archiv vorkommt,
	// zeigt der Badge dorthin (Archiv-Überschriften bekommen ein "archiv-"-Präfix in der Id, damit
	// z.B. "August" (kommend) und "August" (archiviert, gleiches Jahr) nie dieselbe Fragment-Id
	// teilen).
	// `fragmentId` (statt eines fertigen `href`-Strings): das Fragment ist eine
	// reine Same-Page-Anker-Navigation ohne SvelteKit-Route dahinter - im Markup
	// unten als `href="#{badge.fragmentId}"` (literales `#`-Präfix + Ausdruck)
	// zusammengesetzt, damit svelte/no-navigation-without-resolve das als
	// Fragment-Link erkennt (siehe `allowFragment`/`expressionStartsWith` in der
	// Regel - die greift nur, wenn das führende `#` als eigenes Literal im
	// Attribut steht, nicht wenn es Teil eines bereits fertigen String-Werts ist).
	const monthBadges = $derived.by(() => {
		const badges: Array<{ slug: string; label: string; fragmentId: string }> = [];
		const seen = new SvelteSet<string>();
		for (const bucket of eventsByMonth.future) {
			badges.push({ slug: bucket.slug, label: bucket.label, fragmentId: bucket.slug });
			seen.add(bucket.slug);
		}
		for (const bucket of eventsByMonth.archive) {
			if (seen.has(bucket.slug)) continue;
			badges.push({ slug: bucket.slug, label: bucket.label, fragmentId: `archiv-${bucket.slug}` });
			seen.add(bucket.slug);
		}
		if (eventsByMonth.dateless.length > 0) {
			badges.push({ slug: 'ohne-termin', label: 'Ohne Termin', fragmentId: 'ohne-termin' });
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
		<!-- {#if result.ogImageUrl}
			<meta property="og:image" content={result.ogImageUrl} />
			<meta property="og:image:width" content="1200" />
			<meta property="og:image:height" content="630" />
			<meta name="twitter:card" content="summary_large_image" /> -->
		<!-- {:else} -->
		<meta name="twitter:card" content="summary" />
		<!-- {/if} -->
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
				<div class="flex items-start justify-between gap-4">
					<h1 class="m-0">{result.seo.h1}</h1>
					<ShareButton title={result.seo.title} />
				</div>
				<p class="mt-2 text-muted">{result.seo.intro}</p>
				{#each result.seo.regionFlavorParagraphs as paragraph, index (index)}
					<p class="mt-2 text-muted">{paragraph}</p>
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
					{#each monthBadges as badge (badge.fragmentId)}
						<a
							href="#{badge.fragmentId}"
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

			<!--
				Dateless Events ("Termin noch nicht bekannt"): bewusst zwischen den
				terminierten kommenden Events und dem Archiv platziert - so bleiben
				Events mit bekanntem Datum ganz oben (am nützlichsten für Besucher:innen,
				die konkret planen wollen), aber Einträge ohne Termin sind trotzdem
				prominent sichtbar und nicht im Archiv "versteckt" (Produktvorgabe
				"Quantität über Qualität", AGENTS.md 5 - jede Einreichung soll sichtbar
				bleiben, auch unvollständige).
			-->
			{#if eventsByMonth.dateless.length > 0}
				<section class="mb-12" aria-label="Veranstaltungen ohne festen Termin">
					<h2 id="ohne-termin" class="mb-4 text-xl font-semibold">Termin noch nicht bekannt</h2>
					<EventList events={[...eventsByMonth.dateless]} country={result.filters.country} />
				</section>
			{/if}

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
					<strong class="text-text">Deine Party fehlt hier?</strong>
					<a class="text-primary" href={resolve('/veranstaltung-eintragen#formular')}
						>Trag sie in 2 Minuten ein</a
					>
					- dann bist du die Nummer 1 auf dieser Seite.
				</p>
			{/if}

			<LegalDisclaimer />
		</article>
	</main>
{/if}
