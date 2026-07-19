<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { EventList, FaqList } from '$lib/components/index.js';
	import { FAQ_ENTRIES } from '$lib/content/faq.js';
	import { buildFaqJsonLd, jsonLdScriptTag } from '$lib/seo.js';
	import { COUNTRIES, MONTHS, SITE_URL, buildFilterUrl, type Country } from '@dorfpartys/shared';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	const COUNTRY_LABELS: Record<Country, string> = {
		de: 'Deutschland',
		at: 'Österreich',
		ch: 'Schweiz'
	};

	let country = $state<Country>(data.country);
	let bundeslandSlug = $state('');
	let artSlug = $state('');
	let monatSlug = $state('');

	const bundeslaenderForCountry = $derived(
		data.bundeslaenderByCountry.find((g) => g.country === country)?.bundeslaender ?? []
	);

	const homeHref = resolve('/');
	const allCountriesHref = resolve('/?alle');
	const veranstaltungEintragenHref = resolve('/veranstaltung-eintragen');
	const faqHref = resolve('/faq');

	function handleSearch(event: SubmitEvent) {
		event.preventDefault();
		// Kanonische Reihenfolge bundesland -> kreis -> art -> monat (AGENTS.md 1.2) - Kreis
		// wird im Hero-Suchformular bewusst nicht angeboten (zu granular für den Einstieg).
		const segments = [bundeslandSlug, artSlug, monatSlug].filter(Boolean).join('/');
		goto(resolve('/[country]/[...segments]', { country, segments }));
	}

	// Interne Verlinkung zu den wichtigsten Party-Art- und Regions-Hub-Seiten -
	// zentral für Crawlbarkeit: die Landingpage ist der Einstiegspunkt, von dem
	// aus Suchmaschinen/LLMs zu den spezifisch optimierten Such-Seiten (AGENTS.md
	// 1.2/1.6) gelangen, die konkrete Anfragen wie "Scheunenfeten im August in
	// Schleswig-Holstein" beantworten.
	const popularPartyArten = $derived(data.partyArten.slice(0, 8));
	const popularBundeslaender = $derived(bundeslaenderForCountry.slice(0, 10));
	const currentMonth = MONTHS[new Date().getMonth()];

	const websiteJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'dorfpartys.com',
		url: SITE_URL,
		description:
			'Kostenlose, werbefreie Plattform zum Finden und Eintragen von Dorfpartys, Schützenfesten, Zeltfeten und mehr im DACH-Raum.',
		potentialAction: {
			'@type': 'SearchAction',
			target: `${SITE_URL}/de/{search_term_string}/`,
			'query-input': 'required name=search_term_string'
		}
	};
	const organizationJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'dorfpartys.com',
		url: SITE_URL,
		description:
			'Die größte kostenlose Plattform für Dorfpartys, Schützenfeste, Zeltfeten, Scheunenfeten und weitere lokale Feste in Deutschland, Österreich und der Schweiz.',
		sameAs: ['https://instagram.com/dorfpartys']
	};
	const faqJsonLd = buildFaqJsonLd(FAQ_ENTRIES.slice(0, 6));
</script>

<svelte:head>
	<title>dorfpartys.com - Die größte kostenlose Liste für Dorfpartys in DACH</title>
	<meta
		name="description"
		content="Alle Dorfpartys, Schützenfeste, Zeltfeten, Scheunenfeten und Stoppelfeten in Deutschland, Österreich und der Schweiz - kostenlos, werbefrei, filterbar nach Region, Art und Monat. Jede:r kann kostenlos eine Veranstaltung eintragen."
	/>
	<meta name="robots" content="index,follow" />
	<link rel="canonical" href={SITE_URL + '/'} />
	<meta property="og:type" content="website" />
	<meta
		property="og:title"
		content="dorfpartys.com - Die größte kostenlose Liste für Dorfpartys in DACH"
	/>
	<meta
		property="og:description"
		content="Kostenlos, werbefrei und ohne Anmeldung durchsuchbar: alle Dorfpartys im DACH-Raum."
	/>
	<meta property="og:url" content={SITE_URL + '/'} />
	<meta name="twitter:card" content="summary" />
	{@html jsonLdScriptTag(websiteJsonLd)}
	{@html jsonLdScriptTag(organizationJsonLd)}
	{@html jsonLdScriptTag(faqJsonLd)}
</svelte:head>

<section class="relative pt-16 pb-10">
	<div
		class="pointer-events-none absolute -top-15 -left-20 -z-10 h-95 w-95 rounded-full bg-[radial-gradient(circle,rgba(57,230,122,0.35),transparent_70%)] blur-[6px] in-data-[theme='light']:opacity-40"
	></div>

	<h1 class="text-[clamp(2.2rem,6vw,4rem)] leading-[1.05]">
		Wo geht's<br />diesen Sommer <span class="bg-primary px-1 text-ink">ab?</span>
	</h1>
	<p class="mt-0 mb-8 max-w-[46ch] text-[clamp(1rem,2vw,1.2rem)] text-muted">
		Die größte kostenlose Liste für Schützenfeste, Zeltfeten, Scheunenfeten und Stoppelfeten im
		ganzen DACH-Raum - filterbar nach Land, Bundesland, Art und Monat. Jede:r kann kostenlos eine
		Veranstaltung eintragen.
	</p>

	<form class="flex flex-wrap border border-border bg-bg-alt" onsubmit={handleSearch}>
		<div class="flex-1 basis-35 border-r border-border p-3.5">
			<label class="block text-[0.7rem] tracking-[0.08em] text-muted uppercase" for="land"
				>Land</label
			>
			<select
				class="w-full appearance-none border-none bg-transparent p-0 font-body text-[0.95rem] text-text focus:outline-none"
				id="land"
				bind:value={country}
				onchange={() => (bundeslandSlug = '')}
			>
				{#each COUNTRIES as c (c)}
					<option value={c}>{COUNTRY_LABELS[c]}</option>
				{/each}
			</select>
		</div>
		<div class="flex-1 basis-35 border-r border-border p-3.5">
			<label class="block text-[0.7rem] tracking-[0.08em] text-muted uppercase" for="bundesland">
				Bundesland
			</label>
			<select
				class="w-full appearance-none border-none bg-transparent p-0 font-body text-[0.95rem] text-text focus:outline-none"
				id="bundesland"
				bind:value={bundeslandSlug}
			>
				<option value="">Alle</option>
				{#each bundeslaenderForCountry as bl (bl.id)}
					<option value={bl.slug}>{bl.name}</option>
				{/each}
			</select>
		</div>
		<div class="flex-1 basis-35 border-r border-border p-3.5">
			<label class="block text-[0.7rem] tracking-[0.08em] text-muted uppercase" for="art">Art</label
			>
			<select
				class="w-full appearance-none border-none bg-transparent p-0 font-body text-[0.95rem] text-text focus:outline-none"
				id="art"
				bind:value={artSlug}
			>
				<option value="">Alle</option>
				{#each data.partyArten as art (art.id)}
					<option value={art.slug}>{art.name}</option>
				{/each}
			</select>
		</div>
		<div class="flex-1 basis-35 border-r border-border p-3.5 sm:border-r-0">
			<label class="block text-[0.7rem] tracking-[0.08em] text-muted uppercase" for="monat"
				>Monat</label
			>
			<select
				class="w-full appearance-none border-none bg-transparent p-0 font-body text-[0.95rem] text-text focus:outline-none"
				id="monat"
				bind:value={monatSlug}
			>
				<option value="">Alle</option>
				{#each MONTHS as m (m.slug)}
					<option value={m.slug}>{m.name}</option>
				{/each}
			</select>
		</div>
		<button
			type="submit"
			class="min-h-11 w-full flex-1 basis-full cursor-pointer border-none bg-primary p-4 font-bold text-ink sm:basis-auto sm:px-7"
		>
			Suchen
		</button>
	</form>
</section>

<svg
	class="my-8 block h-11 w-full"
	viewBox="0 0 800 60"
	preserveAspectRatio="none"
	aria-hidden="true"
>
	<path
		d="M0,10 C100,50 200,-10 300,30 C400,60 500,0 600,30 C700,50 750,10 800,25"
		fill="none"
		stroke="var(--color-border)"
		stroke-width="1.5"
	/>
	<circle class="drop-shadow-[0_0_5px_var(--color-primary)]" cx="40" cy="18" r="5" fill="#39E67A" />
	<circle
		class="drop-shadow-[0_0_5px_var(--color-secondary)]"
		cx="160"
		cy="35"
		r="5"
		fill="#FF4B3E"
	/>
	<circle
		class="drop-shadow-[0_0_5px_var(--color-primary)]"
		cx="280"
		cy="10"
		r="5"
		fill="#39E67A"
	/>
	<circle
		class="drop-shadow-[0_0_5px_var(--color-primary)]"
		cx="400"
		cy="45"
		r="5"
		fill="#39E67A"
	/>
	<circle
		class="drop-shadow-[0_0_5px_var(--color-secondary)]"
		cx="520"
		cy="15"
		r="5"
		fill="#FF4B3E"
	/>
	<circle
		class="drop-shadow-[0_0_5px_var(--color-primary)]"
		cx="640"
		cy="35"
		r="5"
		fill="#39E67A"
	/>
	<circle
		class="drop-shadow-[0_0_5px_var(--color-primary)]"
		cx="760"
		cy="18"
		r="5"
		fill="#39E67A"
	/>
</svg>

<section class="grid grid-cols-2 gap-6 border-b border-border py-6 sm:grid-cols-4">
	<div class="flex flex-col">
		<strong class="font-display text-[2rem] font-bold text-primary"
			>{data.stats.approvedEvents}</strong
		>
		<span class="text-[0.8rem] text-muted">Events insgesamt</span>
	</div>
	<div class="flex flex-col">
		<strong class="font-display text-[2rem] font-bold text-primary"
			>{data.stats.upcomingEvents}</strong
		>
		<span class="text-[0.8rem] text-muted">kommende Termine</span>
	</div>
	<div class="flex flex-col">
		<strong class="font-display text-[2rem] font-bold text-primary"
			>{data.stats.kreisCoverage}</strong
		>
		<span class="text-[0.8rem] text-muted">Regionen mit Events</span>
	</div>
	<div class="flex flex-col">
		<strong class="font-display text-[2rem] font-bold text-primary">{data.stats.organizers}</strong>
		<span class="text-[0.8rem] text-muted">Veranstalter</span>
	</div>
</section>

<section class="mt-12">
	<div class="flex flex-wrap items-baseline justify-between gap-3">
		<h2 class="mb-1.5 text-[1.6rem]">
			Nächste Partys{#if !data.showAllCountries}
				in {COUNTRY_LABELS[data.country]}{/if}
		</h2>
		{#if data.showAllCountries}
			<a class="text-[0.85rem] text-primary no-underline hover:underline" href={homeHref}>
				Nur {COUNTRY_LABELS[data.country]} anzeigen
			</a>
		{:else}
			<a class="text-[0.85rem] text-primary no-underline hover:underline" href={allCountriesHref}>
				Alle Länder anzeigen
			</a>
		{/if}
	</div>
	{#if data.upcoming.length === 0}
		<p class="mb-6 text-[0.9rem] text-muted">
			Noch keine Termine{#if !data.showAllCountries}
				in {COUNTRY_LABELS[data.country]}{/if} eingetragen - sei die erste Person, die eine einträgt.
		</p>
	{:else}
		<p class="mb-6 text-[0.9rem] text-muted">{data.upcoming.length} kommende Termine</p>
		<EventList events={data.upcoming} country={data.country} />
	{/if}
</section>

<section class="mt-16 max-w-[70ch]">
	<h2 class="text-[1.5rem]">Was ist dorfpartys.com?</h2>
	<p class="leading-relaxed text-muted">
		dorfpartys.com ist die größte kostenlose Übersicht für Dorfpartys, Schützenfeste, Zeltfeten,
		Scheunenfeten, Stoppelfeten, Kirmes und Dorffeste in Deutschland, Österreich und der Schweiz.
		Statt zwischen Instagram-Storys, WhatsApp-Gruppen und Vereins-Websites zu suchen, findest du
		hier alle lokalen Feste einer Region gebündelt an einem Ort - durchsuchbar nach Bundesland,
		Kreis, Art der Veranstaltung und Monat.
	</p>
	<p class="mt-3 leading-relaxed text-muted">
		Jede Veranstaltung wurde von Veranstalter:innen, Vereinen oder Besucher:innen selbst kostenlos
		eingetragen und durchläuft vor der Veröffentlichung eine kurze redaktionelle Prüfung, damit die
		Liste verlässlich und werbefrei bleibt.
	</p>
</section>

{#if popularPartyArten.length > 0}
	<section class="mt-16">
		<h2 class="text-[1.5rem]">
			Beliebte Party-Arten{#if currentMonth}
				im {currentMonth.name}{/if}
		</h2>
		<p class="mb-5 max-w-[60ch] text-muted">
			Direkt zur Übersicht einer Party-Art in {COUNTRY_LABELS[data.country]} springen:
		</p>
		<ul class="flex flex-wrap gap-2">
			{#each popularPartyArten as art (art.id)}
				<li>
					<a
						class="inline-block border border-border px-4 py-2 text-[0.9rem] text-text no-underline hover:border-primary hover:text-primary"
						href={buildFilterUrl(data.country, {
							artSlug: art.slug,
							monatSlug: currentMonth?.slug
						})}
					>
						{art.name}
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if popularBundeslaender.length > 0}
	<section class="mt-16">
		<h2 class="text-[1.5rem]">Regionen in {COUNTRY_LABELS[data.country]}</h2>
		<p class="mb-5 max-w-[60ch] text-muted">
			Alle Dorfpartys in einem Bundesland - auch wenn dort noch kein Termin eingetragen ist, lohnt
			sich ein späterer Blick.
		</p>
		<ul class="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
			{#each popularBundeslaender as bl (bl.id)}
				<li>
					<a
						class="text-[0.9rem] text-text no-underline hover:text-primary hover:underline"
						href={buildFilterUrl(data.country, { bundeslandSlug: bl.slug })}
					>
						{bl.name}
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<section class="mt-16 max-w-[70ch]">
	<h2 class="mt-8 text-[1.5rem]">Warum dein Event hier eintragen?</h2>
	<ul class="my-0 grid list-none gap-4 p-0">
		<li class="border-t border-border py-4 leading-relaxed">
			<strong class="text-text">Die größte Liste im DACH-Raum.</strong> Alle 16 Bundesländer Deutschlands,
			alle 9 Bundesländer Österreichs und alle 26 Kantone der Schweiz sind abgedeckt - dein Event erscheint
			in seiner Region sofort neben allen anderen.
		</li>
		<li class="border-t border-border py-4 leading-relaxed">
			<strong class="text-text">Kostenlos für immer.</strong> Keine versteckten Kosten, keine Promotion-Gebühren,
			keine Bezahlfunktionen - auch nicht später.
		</li>
		<li class="border-t border-border py-4 leading-relaxed">
			<strong class="text-text">Reichweite, die Social Media nicht bietet.</strong> Jede Region, Party-Art
			und jeder Monat hat eine eigene, für Suchmaschinen und KI-Assistenten optimierte Seite - dein Event
			wird dauerhaft gefunden, nicht nur für 24 Stunden im Feed.
		</li>
		<li class="border-t border-border py-4 leading-relaxed">
			<strong class="text-text">100&nbsp;% privatsphärefreundlich.</strong> Keine Werbung, kein Tracking,
			kein Weiterverkauf von Daten - weder deiner noch der deiner Gäste.
		</li>
		<li class="border-t border-b border-border py-4 leading-relaxed">
			<strong class="text-text">Eigene Veranstalter-Seite.</strong> Mit Profil, Links und allen deinen
			Veranstaltungen an einem Ort - praktisch für Vereine mit wiederkehrenden Festen.
		</li>
	</ul>
	<a
		class="mt-6 inline-flex min-h-11 items-center justify-center bg-primary px-6 font-bold text-ink no-underline shadow-[0_0_18px_rgba(57,230,122,0.35)] hover:shadow-[0_0_24px_rgba(57,230,122,0.55)]"
		href={veranstaltungEintragenHref}
	>
		Jetzt Event eintragen
	</a>
</section>

<section class="mt-16">
	<div class="flex flex-wrap items-baseline justify-between gap-3">
		<h2 class="text-[1.5rem]">Häufig gestellte Fragen</h2>
		<a class="text-[0.85rem] text-primary no-underline hover:underline" href={faqHref}
			>Alle Fragen ansehen</a
		>
	</div>
	<div class="mt-5">
		<FaqList items={FAQ_ENTRIES.slice(0, 6)} />
	</div>
</section>
