<script lang="ts">
	import { resolve } from '$app/paths';
	import { Breadcrumbs, EventList } from '$lib/components/index.js';
	import { jsonLdScriptTag, robotsContent } from '$lib/seo.js';
	import { SITE_URL, buildEventUrl, buildFilterUrl, type Country } from '@dorfpartys/shared';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
	let outcome = $derived(data.outcome);
	// +page.server.ts löst redirect/not-found bereits vor dem Rendern auf - hier
	// ist der Outcome immer 'result', aber svelte:head muss top-level bleiben,
	// daher hier einmal auf den engeren Typ verschmälert.
	let result = $derived(outcome.kind === 'result' ? outcome : null);

	const canonical = $derived(
		result ? `${SITE_URL}${buildFilterUrl(result.filters.country, result.filters)}` : ''
	);

	// ItemList-JSON-LD ergänzt BreadcrumbList um die konkreten Treffer dieser Suchseite.
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

	// Sichtbare Breadcrumb-Navigation mit typsicheren Links - getrennt vom
	// JSON-LD (result.breadcrumbJsonLd), das absolute URLs für Suchmaschinen braucht.
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
						: []),
					...(result.filters.monatSlug
						? [
								{
									name: result.names.monatName ?? result.filters.monatSlug,
									href: resolve('/[country]/[...segments]', {
										country: result.filters.country,
										segments: segmentsPath(
											result.filters.bundeslandSlug,
											result.filters.kreisSlug,
											result.filters.artSlug,
											result.filters.monatSlug
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
		<meta name="twitter:card" content="summary" />
		{@html jsonLdScriptTag(result.breadcrumbJsonLd)}
		{#if itemListJsonLd}
			{@html jsonLdScriptTag(itemListJsonLd)}
		{/if}
	{/if}
</svelte:head>

{#if result}
	<Breadcrumbs items={breadcrumbs} />

	<article>
		<header class="mb-8">
			<h1>{result.seo.h1}</h1>
			<p class="mt-2 max-w-[60ch] text-muted">{result.seo.intro}</p>
			<p class="mt-2 text-[0.85rem] text-muted">
				{result.total}
				{result.total === 1 ? 'Treffer' : 'Treffer'}
			</p>
		</header>

		<section aria-label="Veranstaltungen">
			<EventList events={result.results} country={result.filters.country} />
		</section>

		{#if result.results.length === 0}
			<p class="mt-6 text-muted">
				Kennst du eine Party in der Umgebung?
				<a class="text-primary" href={resolve('/veranstaltung-eintragen')}>Trag sie kostenlos ein</a
				>
				- du bist als Erste:r auf dieser Seite gelistet.
			</p>
		{/if}
	</article>
{/if}
