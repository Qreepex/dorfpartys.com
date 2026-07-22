<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, EventList, SearchField, VerifiedBadge } from '$lib/components/index.js';
	import { SITE_URL, type Country } from '@dorfpartys/shared';
	import { untrack } from 'svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	const COUNTRY_LABELS: Record<Country, string> = { de: 'DE', at: 'AT', ch: 'CH' };

	type EventResult = PageData['events'][number];
	type OrganizerResult = PageData['organizers'][number];
	type LocationResult = PageData['locations'][number];

	// Lokaler, mutabler State statt direkt `data.*` zu rendern - das
	// Live-Suchfeld unten aktualisiert diese Werte client-seitig per Debounce
	// (analog zur Navbar-Lupe, NavSearch.svelte), ohne bei jedem Tastendruck
	// eine volle SvelteKit-Navigation/SSR-Reload auszulösen.
	let query = $state(untrack(() => data.query));
	let events = $state<EventResult[]>(untrack(() => data.events));
	let organizers = $state<OrganizerResult[]>(untrack(() => data.organizers));
	let locations = $state<LocationResult[]>(untrack(() => data.locations));
	let loading = $state(false);

	// Verhindert, dass der Debounce-Effekt unten unnötig nachlädt: einmal beim
	// initialen Mount (SSR hat die Daten für `data.query` bereits geliefert)
	// und erneut jedes Mal, wenn eine ECHTE Navigation (z.B. Klick auf einen
	// anderen /suche?q=...-Link) frische `data` liefert - der zweite Fall wird
	// über den Vergleich mit `lastServerQuery` unten erkannt.
	let skipNextFetch = true;
	let lastServerQuery = untrack(() => data.query);

	$effect(() => {
		if (data.query !== lastServerQuery) {
			lastServerQuery = data.query;
			skipNextFetch = true;
			query = data.query;
			events = data.events;
			organizers = data.organizers;
			locations = data.locations;
		}
	});

	let abortController: AbortController | undefined;

	async function runSearch(trimmed: string) {
		replaceState(
			trimmed ? resolve(`/suche?q=${encodeURIComponent(trimmed)}`) : resolve('/suche'),
			{}
		);

		if (trimmed.length < 1) {
			abortController?.abort();
			events = [];
			organizers = [];
			locations = [];
			loading = false;
			return;
		}

		abortController?.abort();
		const controller = new AbortController();
		abortController = controller;
		loading = true;
		try {
			const response = await fetch(`/suche/results?q=${encodeURIComponent(trimmed)}`, {
				signal: controller.signal
			});
			const json = await response.json();
			events = json.events ?? [];
			organizers = json.organizers ?? [];
			locations = json.locations ?? [];
		} catch (error) {
			if ((error as Error).name !== 'AbortError') {
				events = [];
				organizers = [];
				locations = [];
			}
		} finally {
			if (abortController === controller) {
				loading = false;
			}
		}
	}

	// Debounce beim Tippen - identisches Timing/Muster wie die Navbar-Lupe
	// (NavSearch.svelte), nur gegen `search.full` statt `search.global` (großzügigere,
	// aber weiterhin gedeckelte Limits, siehe backend/src/routers/search.ts).
	$effect(() => {
		const trimmed = query.trim();
		if (skipNextFetch) {
			skipNextFetch = false;
			return;
		}
		const timer = setTimeout(() => runSearch(trimmed), 300);
		return () => clearTimeout(timer);
	});

	function handleSubmit(value: string) {
		abortController?.abort();
		runSearch(value.trim());
	}

	const hasQuery = $derived(query.trim().length > 0);
	const totalResults = $derived(events.length + organizers.length + locations.length);

	// SEO (Nutzer-Vorgabe): nur die kanonische Basis-URL /suche soll indexiert
	// werden, nicht die einzelnen `?q=...`-Varianten (sonst potenziell beliebig
	// viele dünne/duplizierte Suchergebnisseiten in Googles Index) - deshalb
	// bewusst KEIN indexable-Umschalten je nach Query, sondern ein statischer,
	// query-unabhängiger Canonical-Tag auf die Basis-URL. Google konsolidiert
	// jede `?q=`-Variante dorthin, statt sie separat zu indexieren.
	const canonicalUrl = `${SITE_URL}/suche`;
	const veranstaltungEintragenHref = resolve('/veranstaltung-eintragen#formular');
</script>

<svelte:head>
	<title>{hasQuery ? `Suche: ${query}` : 'Suche'} | dorfpartys.com</title>
	<meta
		name="description"
		content="Durchsuche alle Dorfpartys, Schützenfeste, Zeltfeten, Scheunenfeten und Stoppelfeten in Deutschland, Österreich und der Schweiz nach Titel oder Ort."
	/>
	<meta name="robots" content="index,follow" />
	<link rel="canonical" href={canonicalUrl} />
</svelte:head>

<main class="mx-auto max-w-[90ch]">
	<button
		type="button"
		class="mb-4 inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[0.85rem] text-muted no-underline hover:text-primary"
		onclick={() => history.back()}
	>
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M15 18l-6-6 6-6" />
		</svg>
		Zurück
	</button>

	<h1>Suche</h1>

	<p class="mt-2 max-w-[60ch] text-muted">
		Suche hier nach Schützenfesten, Zeltfeten, Scheunenfeten, Stoppelfeten und weiteren Dorfpartys
		in Deutschland, Österreich und der Schweiz - nach Titel oder Ort. Alternativ lässt sich die
		gesamte Liste auch über Land, Bundesland und Party-Art filtern.
	</p>

	<div class="mt-4 max-w-[46ch]">
		<SearchField
			bind:value={query}
			placeholder="Veranstaltungen, Veranstalter…"
			onSubmit={handleSubmit}
		/>
	</div>

	{#if !hasQuery}
		<p class="mt-6 text-muted">
			Gib einen Suchbegriff ein, um Veranstaltungen und Veranstalter zu finden.
		</p>
	{:else if loading && totalResults === 0}
		<p class="mt-6 text-muted">Suche läuft…</p>
	{:else if totalResults === 0}
		<p class="mt-6 text-muted">Keine Treffer für „{query}“.</p>
	{:else}
		<p class="mt-6 text-muted">{totalResults} Treffer für „{query}“</p>

		{#if events.length > 0}
			<section class="mt-8">
				<h2>Veranstaltungen</h2>
				<EventList {events} country={events[0]?.country ?? 'de'} />
			</section>
		{/if}

		{#if locations.length > 0}
			<section class="mt-8">
				<h2>Orte & Kategorien</h2>
				<ul class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					{#each locations as item (item.href)}
						<li>
							<a
								class="flex items-center gap-3 border border-border bg-bg-alt px-4 py-3 text-text no-underline hover:border-primary hover:text-primary"
								href={item.href}
							>
								<span
									class="flex-0 shrink-0 border border-border px-1.5 py-0.5 text-[0.68rem] font-bold tracking-wider text-muted uppercase"
								>
									{COUNTRY_LABELS[item.country as Country]}
								</span>
								<span class="min-w-0 flex-1 truncate text-[0.95rem]">{item.label}</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if organizers.length > 0}
			<section class="mt-12">
				<h2>Veranstalter</h2>
				<ul class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					{#each organizers as item (item.slug)}
						<li>
							<a
								class="flex items-center gap-3 border border-border bg-bg-alt px-4 py-3 text-text no-underline hover:border-primary hover:text-primary"
								href={resolve('/veranstalter/[slug]', { slug: item.slug })}
							>
								{#if item.avatarUrl}
									<img
										class="h-9 w-9 shrink-0 rounded-full object-cover"
										src={item.avatarUrl}
										alt=""
										width="36"
										height="36"
									/>
								{:else}
									<span
										class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[0.85rem] font-bold text-ink"
									>
										{item.displayName.trim().charAt(0).toUpperCase() || '?'}
									</span>
								{/if}
								<span class="min-w-0 flex-1">
									<span class="flex items-center gap-1 truncate text-[0.95rem]">
										{item.displayName}
										{#if item.verified}<VerifiedBadge />{/if}
									</span>
									<span class="block truncate text-[0.8rem] text-muted">
										{item.eventCount}
										{item.eventCount === 1 ? 'Veranstaltung' : 'Veranstaltungen'}
										{#if item.countries.length > 0}
											· {item.countries.map((c) => COUNTRY_LABELS[c as Country]).join('/')}
										{/if}
									</span>
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}

	<section class="mt-16 border-t border-border pt-8">
		<p class="text-muted">
			<strong class="text-text">Dir fehlt was?</strong> Füge jetzt kostenlos eine Veranstaltung hinzu
			- dauert 2 Minuten.
		</p>
		<Button href={veranstaltungEintragenHref} class="mt-3">Veranstaltung eintragen</Button>
	</section>
</main>
