<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { EventList } from '$lib/components/index.js';
	import { jsonLdScriptTag } from '$lib/seo.js';
	import { COUNTRIES, MONTHS, SITE_URL, type Country } from '@dorfpartys/shared';
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

	function handleSearch(event: SubmitEvent) {
		event.preventDefault();
		// Kanonische Reihenfolge bundesland -> kreis -> art -> monat (AGENTS.md 1.2) — Kreis
		// wird im Hero-Suchformular bewusst nicht angeboten (zu granular für den Einstieg).
		const segments = [bundeslandSlug, artSlug, monatSlug].filter(Boolean).join('/');
		goto(resolve('/[country]/[...segments]', { country, segments }));
	}

	const websiteJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'dorfpartys.com',
		url: SITE_URL,
		description:
			'Kostenlose, werbefreie Plattform zum Finden und Eintragen von Dorfpartys, Schützenfesten, Zeltfeten und mehr im DACH-Raum.'
	};
</script>

<svelte:head>
	<title>dorfpartys.com — Dorfpartys, Schützenfeste &amp; Zeltfeten in ganz DACH finden</title>
	<meta
		name="description"
		content="Alle Dorfpartys, Schützenfeste, Zeltfeten, Scheunenfeten und Stoppelfeten in Deutschland, Österreich und der Schweiz — kostenlos, werbefrei, filterbar nach Region, Art und Monat."
	/>
	<meta name="robots" content="index,follow" />
	<link rel="canonical" href={SITE_URL + '/'} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="dorfpartys.com — Dorfpartys in ganz DACH finden" />
	<meta
		property="og:description"
		content="Kostenlos, werbefrei und ohne Anmeldung durchsuchbar: alle Dorfpartys im DACH-Raum."
	/>
	<meta property="og:url" content={SITE_URL + '/'} />
	<meta name="twitter:card" content="summary" />
	{@html jsonLdScriptTag(websiteJsonLd)}
</svelte:head>

<section class="hero">
	<h1>Wo geht's<br />diesen Sommer <span class="accent">ab?</span></h1>
	<p class="lead">
		Schützenfeste, Zeltfeten, Scheunenfeten und Stoppelfeten im ganzen DACH-Raum — filterbar
		nach Land, Bundesland, Art und Monat. Kostenlos und ohne Werbung.
	</p>

	<form class="search" onsubmit={handleSearch}>
		<div class="field">
			<label for="land">Land</label>
			<select id="land" bind:value={country} onchange={() => (bundeslandSlug = '')}>
				{#each COUNTRIES as c (c)}
					<option value={c}>{COUNTRY_LABELS[c]}</option>
				{/each}
			</select>
		</div>
		<div class="field">
			<label for="bundesland">Bundesland</label>
			<select id="bundesland" bind:value={bundeslandSlug}>
				<option value="">Alle</option>
				{#each bundeslaenderForCountry as bl (bl.id)}
					<option value={bl.slug}>{bl.name}</option>
				{/each}
			</select>
		</div>
		<div class="field">
			<label for="art">Art</label>
			<select id="art" bind:value={artSlug}>
				<option value="">Alle</option>
				{#each data.partyArten as art (art.id)}
					<option value={art.slug}>{art.name}</option>
				{/each}
			</select>
		</div>
		<div class="field">
			<label for="monat">Monat</label>
			<select id="monat" bind:value={monatSlug}>
				<option value="">Alle</option>
				{#each MONTHS as m (m.slug)}
					<option value={m.slug}>{m.name}</option>
				{/each}
			</select>
		</div>
		<button type="submit">Suchen</button>
	</form>
</section>

<svg class="lights" viewBox="0 0 800 60" preserveAspectRatio="none" aria-hidden="true">
	<path
		d="M0,10 C100,50 200,-10 300,30 C400,60 500,0 600,30 C700,50 750,10 800,25"
		fill="none"
		stroke="var(--color-border)"
		stroke-width="1.5"
	/>
	<circle class="bulb-primary" cx="40" cy="18" r="5" fill="#39E67A" />
	<circle class="bulb-secondary" cx="160" cy="35" r="5" fill="#FF4B3E" />
	<circle class="bulb-primary" cx="280" cy="10" r="5" fill="#39E67A" />
	<circle class="bulb-primary" cx="400" cy="45" r="5" fill="#39E67A" />
	<circle class="bulb-secondary" cx="520" cy="15" r="5" fill="#FF4B3E" />
	<circle class="bulb-primary" cx="640" cy="35" r="5" fill="#39E67A" />
	<circle class="bulb-primary" cx="760" cy="18" r="5" fill="#39E67A" />
</svg>

<section class="stats">
	<div class="stat"><strong>{data.stats.approvedEvents}</strong><span>Events insgesamt</span></div>
	<div class="stat">
		<strong>{data.stats.upcomingEvents}</strong><span>kommende Termine</span>
	</div>
	<div class="stat">
		<strong>{data.stats.kreisCoverage}</strong><span>Regionen mit Events</span>
	</div>
	<div class="stat">
		<strong>{data.stats.organizers}</strong><span>Veranstalter</span>
	</div>
</section>

<section class="lineup">
	<div class="lineup-header">
		<h2>
			Nächste Partys{#if !data.showAllCountries} in {COUNTRY_LABELS[data.country]}{/if}
		</h2>
		{#if data.showAllCountries}
			<a href={homeHref}>Nur {COUNTRY_LABELS[data.country]} anzeigen</a>
		{:else}
			<a href={allCountriesHref}>Alle Länder anzeigen</a>
		{/if}
	</div>
	{#if data.upcoming.length === 0}
		<p class="sub">
			Noch keine Termine{#if !data.showAllCountries} in {COUNTRY_LABELS[data.country]}{/if} eingetragen
			— sei die erste Person, die eine einträgt.
		</p>
	{:else}
		<p class="sub">{data.upcoming.length} kommende Termine</p>
		<EventList events={data.upcoming} country={data.country} />
	{/if}
</section>

<section class="explainer">
	<h2>Woher kommen die Events?</h2>
	<p>
		Jede Party auf dorfpartys.com wurde von Veranstalter:innen, Vereinen oder Besucher:innen
		selbst eingetragen — kostenlos, in wenigen Minuten. Jede Einreichung durchläuft vor der
		Veröffentlichung eine redaktionelle Prüfung, damit die Suche verlässlich bleibt.
	</p>

	<h2>Warum dein Event hier eintragen?</h2>
	<ul class="benefits">
		<li>
			<strong>Kostenlos für immer.</strong> Keine versteckten Kosten, keine Promotion-Gebühren.
		</li>
		<li>
			<strong>Bessere Sichtbarkeit.</strong> Jede Region, Party-Art und jeder Monat hat eine
			eigene, suchmaschinenoptimierte Seite — dein Event wird dort gefunden, wo Leute in der
			Umgebung suchen.
		</li>
		<li>
			<strong>100&nbsp;% privatsphärefreundlich.</strong> Keine Werbung, kein Tracking, kein
			Weiterverkauf von Daten — weder deiner noch der deiner Gäste.
		</li>
		<li>
			<strong>Eigene Veranstalter-Seite.</strong> Mit Profil, Links und allen deinen
			Veranstaltungen an einem Ort.
		</li>
	</ul>
	<a class="cta" href={resolve('/submit')}>Jetzt Event eintragen</a>
</section>

<style>
	.hero {
		position: relative;
		padding: 64px 0 40px;
	}

	.hero::before {
		content: '';
		position: absolute;
		top: -60px;
		left: -80px;
		width: 380px;
		height: 380px;
		background: radial-gradient(circle, rgba(57, 230, 122, 0.35), transparent 70%);
		filter: blur(6px);
		z-index: -1;
		pointer-events: none;
	}

	:global(:root[data-theme='light']) .hero::before {
		opacity: 0.4;
	}

	.hero h1 {
		font-size: clamp(2.2rem, 6vw, 4rem);
		line-height: 1.05;
	}

	.hero h1 .accent {
		background: var(--color-primary);
		color: var(--color-ink);
		padding: 0 0.18em;
		box-decoration-break: clone;
		-webkit-box-decoration-break: clone;
	}

	.hero p.lead {
		font-size: clamp(1rem, 2vw, 1.2rem);
		color: var(--color-text-muted);
		max-width: 46ch;
		margin: 0 0 32px;
	}

	form.search {
		display: flex;
		flex-wrap: wrap;
		gap: 0;
		border: 1px solid var(--color-border);
		background: var(--color-bg-alt);
	}

	form.search .field {
		flex: 1 1 140px;
		padding: 14px 16px;
		border-right: 1px solid var(--color-border);
	}

	form.search .field:last-of-type {
		border-right: none;
	}

	form.search label {
		display: block;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
		margin-bottom: 4px;
	}

	form.search select {
		width: 100%;
		background: transparent;
		border: none;
		color: var(--color-text);
		font-family: 'Inter', system-ui, sans-serif;
		font-size: 0.95rem;
		padding: 0;
		appearance: none;
	}

	form.search select:focus {
		outline: none;
	}

	form.search button {
		flex: 1 1 100%;
		border: none;
		background: var(--color-primary);
		color: var(--color-ink);
		font-weight: 700;
		font-size: 0.95rem;
		padding: 16px;
		cursor: pointer;
	}

	@media (min-width: 640px) {
		form.search button {
			flex: 0 0 auto;
			padding: 0 28px;
		}
	}

	.lights {
		display: block;
		width: 100%;
		height: 44px;
		margin: 48px 0 8px;
	}

	.lights .bulb-primary {
		filter: drop-shadow(0 0 5px var(--color-primary));
	}

	.lights .bulb-secondary {
		filter: drop-shadow(0 0 5px var(--color-secondary));
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 24px;
		padding: 24px 0;
		border-bottom: 1px solid var(--color-border);
	}

	@media (min-width: 560px) {
		.stats {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.stat {
		display: flex;
		flex-direction: column;
	}

	.stat strong {
		font-family: 'Fraunces', serif;
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-primary);
	}

	.stat span {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.lineup {
		margin-top: 48px;
	}

	.lineup-header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
	}

	.lineup-header a {
		font-size: 0.85rem;
		color: var(--color-primary);
		text-decoration: none;
		white-space: nowrap;
	}

	.lineup-header a:hover {
		text-decoration: underline;
	}

	.lineup h2 {
		font-size: 1.6rem;
		margin-bottom: 6px;
	}

	.lineup .sub {
		color: var(--color-text-muted);
		font-size: 0.9rem;
		margin-bottom: 24px;
	}

	.explainer {
		margin-top: 64px;
		max-width: 68ch;
	}

	.explainer h2 {
		font-size: 1.5rem;
		margin-top: 32px;
	}

	.explainer p {
		color: var(--color-text-muted);
		line-height: 1.6;
	}

	.benefits {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 16px;
	}

	.benefits li {
		padding: 16px 0;
		border-top: 1px solid var(--color-border);
		line-height: 1.5;
	}

	.benefits li strong {
		color: var(--color-text);
	}

	.cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 0 24px;
		margin-top: 24px;
		background: var(--color-primary);
		color: var(--color-ink);
		font-weight: 700;
		text-decoration: none;
		box-shadow: 0 0 18px rgba(57, 230, 122, 0.35);
	}

	.cta:hover {
		box-shadow: 0 0 24px rgba(57, 230, 122, 0.55);
	}
</style>
