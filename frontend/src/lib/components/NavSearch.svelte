<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Country } from '@dorfpartys/shared';
	import VerifiedBadge from './VerifiedBadge.svelte';

	// Globale Freitextsuche über die Lupe in der Navbar (Events + Veranstalter,
	// backend/src/routers/search.ts `global`) - live Autocomplete während der
	// Eingabe, analog zur Veranstalter-Suche im Einreichungsformular
	// (frontend/src/routes/veranstaltung-eintragen/+page.svelte).
	type EventResult = {
		type: 'event';
		slug: string;
		title: string;
		country: Country;
		startDate: string | null;
		endDate: string | null;
		organizerName: string;
		organizerVerified: boolean;
	};
	type OrganizerResult = {
		type: 'organizer';
		slug: string;
		displayName: string;
		avatarUrl: string | null;
		verified: boolean;
		eventCount: number;
		countries: Country[];
	};
	// Treffer aus den Filter-Vokabularen (Bundesland/Kreis/Party-Art) + Land
	// (backend/src/routers/search.ts `findTaxonomyMatch`) - z.B. "Schleswig
	// Holstein" -> /de/schleswig-holstein/, "Open Air Niedersachsen" ->
	// /de/niedersachsen/open-air/. `href` ist bereits eine fertige, absolute
	// Pfad-URL (buildFilterUrl im Backend) - kein `resolve()` nötig.
	type LocationResult = {
		type: 'location';
		href: string;
		label: string;
		country: Country;
	};
	type Result = LocationResult | EventResult | OrganizerResult;

	const COUNTRY_LABELS: Record<Country, string> = { de: 'DE', at: 'AT', ch: 'CH' };

	let open = $state(false);
	let query = $state('');
	let loading = $state(false);
	let events = $state<EventResult[]>([]);
	let organizers = $state<OrganizerResult[]>([]);
	let locations = $state<LocationResult[]>([]);
	let activeIndex = $state(-1);
	let panelEl: HTMLDivElement | undefined = $state();
	let inputEl: HTMLInputElement | undefined = $state();

	const results = $derived<Result[]>([...locations, ...events, ...organizers]);
	const hasQuery = $derived(query.trim().length > 0);
	const hasResults = $derived(results.length > 0);

	function openSearch() {
		open = true;
		activeIndex = -1;
		requestAnimationFrame(() => inputEl?.focus());
	}

	function closeSearch() {
		open = false;
		query = '';
		events = [];
		organizers = [];
		locations = [];
		activeIndex = -1;
	}

	let abortController: AbortController | undefined;

	$effect(() => {
		const q = query.trim();
		activeIndex = -1;
		if (q.length < 1) {
			events = [];
			organizers = [];
			locations = [];
			loading = false;
			return;
		}
		const timer = setTimeout(async () => {
			abortController?.abort();
			const controller = new AbortController();
			abortController = controller;
			loading = true;
			try {
				const response = await fetch(`/search?q=${encodeURIComponent(q)}`, {
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
		}, 150);
		return () => clearTimeout(timer);
	});

	function resultHref(result: Result) {
		if (result.type === 'event') {
			return resolve('/[country]/veranstaltung/[slug]', {
				country: result.country,
				slug: result.slug
			});
		}
		if (result.type === 'organizer') {
			return resolve('/veranstalter/[slug]', { slug: result.slug });
		}
		return result.href;
	}

	// Volltextsuche: Enter ohne aktive Dropdown-Auswahl (oder Klick auf "Alle
	// Ergebnisse") springt auf die vollwertige Ergebnisseite /suche?q=... statt
	// nur die Top-6-Autocomplete-Treffer anzuzeigen.
	function goToFullResults() {
		const trimmed = query.trim();
		if (trimmed.length < 1) return;
		closeSearch();
		goto(resolve(`/suche?q=${encodeURIComponent(trimmed)}`));
	}

	function handleOutsideClick(event: MouseEvent) {
		if (panelEl && !panelEl.contains(event.target as Node)) {
			closeSearch();
		}
	}

	$effect(() => {
		if (!open) return;
		document.addEventListener('click', handleOutsideClick);
		return () => document.removeEventListener('click', handleOutsideClick);
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeSearch();
			return;
		}
		if (hasResults && event.key === 'ArrowDown') {
			event.preventDefault();
			activeIndex = (activeIndex + 1) % results.length;
			return;
		}
		if (hasResults && event.key === 'ArrowUp') {
			event.preventDefault();
			activeIndex = (activeIndex - 1 + results.length) % results.length;
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			// Ein aktiv per Pfeiltasten ausgewähltes Autocomplete-Ergebnis geht vor -
			// sonst (keine Auswahl getroffen) landet man auf der vollen Ergebnisseite.
			if (hasResults && activeIndex >= 0) {
				window.location.href = resultHref(results[activeIndex]);
				return;
			}
			goToFullResults();
		}
	}

	function day(iso: string | null) {
		return iso
			? new Date(iso).toLocaleDateString('de-DE', {
					day: '2-digit',
					month: '2-digit',
					timeZone: 'Europe/Berlin'
				})
			: 'Ohne Termin';
	}
</script>

<div class="relative" bind:this={panelEl}>
	<button
		type="button"
		class="flex h-11 w-11 cursor-pointer items-center justify-center border border-border bg-transparent text-text hover:border-primary hover:text-primary"
		onclick={openSearch}
		aria-haspopup="dialog"
		aria-expanded={open}
		aria-label="Suche öffnen"
	>
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			aria-hidden="true"
		>
			<circle cx="11" cy="11" r="7" />
			<path d="m20 20-3.5-3.5" />
		</svg>
	</button>

	{#if open}
		<div
			class="absolute top-full right-0 z-20 mt-1.5 flex max-h-[75vh] w-96 max-w-[90vw] flex-col overflow-hidden border border-border bg-bg-alt"
			role="dialog"
			tabindex="-1"
			aria-label="Veranstaltungen und Veranstalter durchsuchen"
			onkeydown={handleKeydown}
		>
			<div class="border-b border-border p-2">
				<input
					bind:this={inputEl}
					bind:value={query}
					type="search"
					placeholder="Veranstaltungen, Veranstalter…"
					class="w-full border-0 bg-transparent px-2 py-2 text-[0.95rem] text-text outline-none placeholder:text-muted"
					aria-label="Suchbegriff"
				/>
			</div>
			<div class="overflow-y-auto">
				{#if !hasQuery}
					<p class="px-3.5 py-4 text-[0.85rem] text-muted">
						Tippe, um nach Veranstaltungen oder Veranstaltern zu suchen.
					</p>
				{:else if loading && !hasResults}
					<p class="px-3.5 py-4 text-[0.85rem] text-muted">Suche läuft…</p>
				{:else if !hasResults}
					<p class="px-3.5 py-4 text-[0.85rem] text-muted">Keine Treffer für „{query}“.</p>
					<button
						type="button"
						class="w-full cursor-pointer border-t border-border bg-transparent px-3.5 py-2.5 text-left text-[0.85rem] text-primary hover:bg-border"
						onclick={goToFullResults}
					>
						Trotzdem alle Ergebnisse anzeigen →
					</button>
				{:else}
					{#if locations.length > 0}
						<p
							class="px-3.5 pt-3 pb-1 text-[0.72rem] font-bold tracking-[0.08em] text-muted uppercase"
						>
							Orte & Kategorien
						</p>
						<ul>
							{#each locations as item, i (item.href)}
								<li>
									<a
										class={`flex items-center gap-2.5 px-3.5 py-2.5 no-underline hover:bg-border ${activeIndex === i ? 'bg-border' : ''}`}
										href={item.href}
										onclick={closeSearch}
									>
										<span
											class="flex-0 shrink-0 border border-border px-1.5 py-0.5 text-[0.68rem] font-bold tracking-wider text-muted uppercase"
										>
											{COUNTRY_LABELS[item.country]}
										</span>
										<span class="min-w-0 flex-1 truncate text-[0.92rem] text-text"
											>{item.label}</span
										>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
					{#if events.length > 0}
						<p
							class="px-3.5 pt-3 pb-1 text-[0.72rem] font-bold tracking-[0.08em] text-muted uppercase"
						>
							Veranstaltungen
						</p>
						<ul>
							{#each events as item, i (item.slug)}
								<li>
									<a
										class={`flex items-start gap-2.5 px-3.5 py-2.5 no-underline hover:bg-border ${activeIndex === locations.length + i ? 'bg-border' : ''}`}
										href={resultHref(item)}
										onclick={closeSearch}
									>
										<span
											class="mt-0.5 flex-0 shrink-0 border border-border px-1.5 py-0.5 text-[0.68rem] font-bold tracking-wider text-muted uppercase"
										>
											{COUNTRY_LABELS[item.country]}
										</span>
										<span class="min-w-0 flex-1">
											<span class="block truncate text-[0.92rem] text-text">{item.title}</span>
											<span class="flex items-center gap-1 truncate text-[0.8rem] text-muted">
												{day(item.startDate)} · {item.organizerName}
												{#if item.organizerVerified}<VerifiedBadge />{/if}
											</span>
										</span>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
					{#if organizers.length > 0}
						<p
							class="px-3.5 pt-3 pb-1 text-[0.72rem] font-bold tracking-[0.08em] text-muted uppercase"
						>
							Veranstalter
						</p>
						<ul>
							{#each organizers as item, i (item.slug)}
								<li>
									<a
										class={`flex items-center gap-2.5 px-3.5 py-2.5 no-underline hover:bg-border ${activeIndex === locations.length + events.length + i ? 'bg-border' : ''}`}
										href={resultHref(item)}
										onclick={closeSearch}
									>
										{#if item.avatarUrl}
											<img
												class="h-7 w-7 shrink-0 rounded-full object-cover"
												src={item.avatarUrl}
												alt=""
												width="28"
												height="28"
											/>
										{:else}
											<span
												class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[0.75rem] font-bold text-ink"
											>
												{item.displayName.trim().charAt(0).toUpperCase() || '?'}
											</span>
										{/if}
										<span class="min-w-0 flex-1">
											<span class="flex items-center gap-1 truncate text-[0.92rem] text-text">
												{item.displayName}
												{#if item.verified}<VerifiedBadge />{/if}
											</span>
											<span class="truncate text-[0.8rem] text-muted">
												{item.eventCount}
												{item.eventCount === 1 ? 'Veranstaltung' : 'Veranstaltungen'}
												{#if item.countries.length > 0}
													· {item.countries.map((c) => COUNTRY_LABELS[c]).join('/')}
												{/if}
											</span>
										</span>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
					<button
						type="button"
						class="w-full cursor-pointer border-t border-border bg-transparent px-3.5 py-2.5 text-left text-[0.85rem] text-primary hover:bg-border"
						onclick={goToFullResults}
					>
						Alle Ergebnisse anzeigen →
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	:global(input[type='search']::-webkit-search-cancel-button) {
		display: none;
	}
</style>
