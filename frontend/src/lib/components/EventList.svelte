<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';
	import type { Country } from '@dorfpartys/shared';

	interface DisplayEvent {
		slug: string | null;
		title: string;
		// Optional (AGENTS.md 5, "Quantität über Qualität") - dateless Events
		// zeigen statt Tag/Monat ein "TBA"-Badge, siehe day()/monthAbbr() unten.
		startDate: string | null;
		customColor: string;
		bundeslandName: string;
		kreisName: string;
		partyArtName: string;
		/** Nur nötig bei DACH-weiten Listen mit gemischten Ländern - sonst wird `country` (Prop) verwendet. */
		country?: Country;
		/** Für `itemExtra`-Aktionen, die die Event-DB-ID brauchen (z.B. Entfernen auf /partyliste). */
		eventId?: string;
	}

	interface Props {
		events: DisplayEvent[];
		/** Fallback-Land für Events ohne eigenes `country`-Feld. */
		country: Country;
		/** Optionale Zusatz-Aktion pro Zeile, z.B. "Entfernen" auf /partyliste. */
		itemExtra?: Snippet<[DisplayEvent]>;
	}

	let { events, country, itemExtra }: Props = $props();

	function eventHref(item: DisplayEvent) {
		if (!item.slug) return null;
		return resolve('/[country]/veranstaltung/[slug]', {
			country: item.country ?? country,
			slug: item.slug
		});
	}

	const MONTH_ABBR = [
		'JAN',
		'FEB',
		'MÄR',
		'APR',
		'MAI',
		'JUN',
		'JUL',
		'AUG',
		'SEP',
		'OKT',
		'NOV',
		'DEZ'
	];

	function day(iso: string | null) {
		return iso ? new Date(iso).getDate().toString().padStart(2, '0') : '–';
	}
	function monthAbbr(iso: string | null) {
		return iso ? MONTH_ABBR[new Date(iso).getMonth()] : 'TBA';
	}
</script>

{#if events.length === 0}
	<p class="empty">Für diese Auswahl ist aktuell kein Termin eingetragen.</p>
{:else}
	<ul class="events">
		{#each events as item (item.slug ?? item.title)}
			<li class="event-row">
				<span class="event-date"
					>{day(item.startDate)}<small>{monthAbbr(item.startDate)}</small></span
				>
				<span class="event-info">
					{#if eventHref(item)}
						<a class="event-title" href={eventHref(item)}>{item.title}</a>
					{:else}
						<span class="event-title">{item.title}</span>
					{/if}
					<span class="event-meta">{item.kreisName} · {item.bundeslandName}</span>
				</span>
				<span class="event-tag" style={`border-color: ${item.customColor}`}
					>{item.partyArtName}</span
				>
				{#if itemExtra}
					{@render itemExtra(item)}
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.empty {
		color: var(--color-muted);
		padding: 24px 0;
		border-top: 1px solid var(--color-border);
	}

	ul.events {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.event-row {
		display: flex;
		align-items: center;
		gap: 20px;
		padding: 20px 0;
		border-top: 1px solid var(--color-border);
	}

	.event-row:last-child {
		border-bottom: 1px solid var(--color-border);
	}

	.event-date {
		font-family: 'Fraunces', serif;
		font-weight: 700;
		font-size: 1.3rem;
		line-height: 1;
		color: var(--color-ink);
		background: var(--color-primary);
		flex: 0 0 52px;
		text-align: center;
		padding: 8px 4px;
	}

	.event-date small {
		display: block;
		font-family: 'Inter', system-ui, sans-serif;
		font-weight: 700;
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		color: var(--color-ink);
		opacity: 0.75;
		margin-top: 4px;
	}

	.event-info {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.event-title {
		font-weight: 600;
		font-size: 1.05rem;
		text-decoration: none;
		color: var(--color-text);
	}

	.event-title:hover {
		color: var(--color-primary);
	}

	.event-meta {
		color: var(--color-muted);
		font-size: 0.85rem;
	}

	.event-tag {
		flex: 0 0 auto;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		border-left: 2px solid var(--color-secondary);
		padding-left: 8px;
		color: var(--color-muted);
		display: none;
	}

	@media (min-width: 560px) {
		.event-tag {
			display: block;
		}
	}
</style>
