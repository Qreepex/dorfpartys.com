<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Country } from '@dorfpartys/shared';
	import './form-field.css';
	import VerifiedBadge from './VerifiedBadge.svelte';

	// Inline-Freitextsuche mit Live-Autocomplete (Events + Veranstalter,
	// backend/src/routers/search.ts `global`, dasselbe `/search`-Endpoint wie
	// NavSearch.svelte) - im Gegensatz zu NavSearch permanent sichtbares Feld
	// statt Icon-getriggertem Popover (z.B. Hero-Suchfeld auf der Startseite),
	// daher eigene, schlankere Komponente statt Wiederverwendung von NavSearch.
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

	interface Props {
		value: string;
		placeholder?: string;
		/** Enter ohne aktive Pfeiltasten-Auswahl, oder Klick auf "Alle Ergebnisse". */
		onSubmit: (value: string) => void;
	}

	let { value = $bindable(''), placeholder = 'Suchen…', onSubmit }: Props = $props();

	const COUNTRY_LABELS: Record<Country, string> = { de: 'DE', at: 'AT', ch: 'CH' };

	let events = $state<EventResult[]>([]);
	let organizers = $state<OrganizerResult[]>([]);
	let locations = $state<LocationResult[]>([]);
	let loading = $state(false);
	let activeIndex = $state(-1);
	let focused = $state(false);
	let containerEl: HTMLDivElement | undefined = $state();

	const results = $derived<Result[]>([...locations, ...events, ...organizers]);
	const hasQuery = $derived(value.trim().length > 0);
	const hasResults = $derived(results.length > 0);
	const showPanel = $derived(focused && hasQuery);

	let abortController: AbortController | undefined;

	$effect(() => {
		const q = value.trim();
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
			return resolve('/[country]/veranstaltung/[slug]', { country: result.country, slug: result.slug });
		}
		if (result.type === 'organizer') {
			return resolve('/veranstalter/[slug]', { slug: result.slug });
		}
		return result.href;
	}

	function closePanel() {
		focused = false;
		activeIndex = -1;
	}

	function handleOutsideClick(event: MouseEvent) {
		if (containerEl && !containerEl.contains(event.target as Node)) {
			closePanel();
		}
	}

	$effect(() => {
		if (!showPanel) return;
		document.addEventListener('click', handleOutsideClick);
		return () => document.removeEventListener('click', handleOutsideClick);
	});

	function submitFullResults() {
		const trimmed = value.trim();
		if (trimmed.length < 1) return;
		closePanel();
		onSubmit(trimmed);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closePanel();
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
			if (hasResults && activeIndex >= 0) {
				window.location.href = resultHref(results[activeIndex]);
				return;
			}
			submitFullResults();
		}
	}

	function day(iso: string | null) {
		return iso
			? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
			: 'Ohne Termin';
	}

	function clear() {
		value = '';
	}
</script>

<div class="field relative" bind:this={containerEl}>
	<div class="field-control-wrap">
		<span class="field-affix" aria-hidden="true">
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			>
				<circle cx="11" cy="11" r="7" />
				<path d="m20 20-3.5-3.5" />
			</svg>
		</span>
		<input
			class="field-control"
			type="search"
			bind:value
			{placeholder}
			onfocus={() => (focused = true)}
			onkeydown={handleKeydown}
			aria-label="Suchbegriff"
		/>
		{#if value}
			<button
				type="button"
				class="field-affix clear"
				aria-label="Suche zurücksetzen"
				onclick={clear}
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				>
					<path d="M6 6l12 12M18 6 6 18" />
				</svg>
			</button>
		{/if}
	</div>

	{#if showPanel}
		<div
			class="absolute top-full left-0 z-20 mt-1.5 flex max-h-[70vh] w-full flex-col overflow-hidden border border-border bg-bg-alt"
			role="listbox"
			aria-label="Suchergebnisse"
		>
			<div class="overflow-y-auto">
				{#if loading && !hasResults}
					<p class="px-3.5 py-4 text-[0.85rem] text-muted">Suche läuft…</p>
				{:else if !hasResults}
					<p class="px-3.5 py-4 text-[0.85rem] text-muted">Keine Treffer für „{value}“.</p>
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
										onclick={closePanel}
									>
										<span
											class="flex-0 shrink-0 border border-border px-1.5 py-0.5 text-[0.68rem] font-bold tracking-wider text-muted uppercase"
										>
											{COUNTRY_LABELS[item.country]}
										</span>
										<span class="min-w-0 flex-1 truncate text-[0.92rem] text-text">{item.label}</span>
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
										onclick={closePanel}
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
										onclick={closePanel}
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
				{/if}
				<button
					type="button"
					class="w-full cursor-pointer border-t border-border bg-transparent px-3.5 py-2.5 text-left text-[0.85rem] text-primary hover:bg-border"
					onclick={submitFullResults}
				>
					Alle Ergebnisse anzeigen →
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(input[type='search']::-webkit-search-cancel-button) {
		display: none;
	}
</style>
