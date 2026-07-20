<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/index.js';
	import type { Country } from '@dorfpartys/shared';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	const STATUS_LABELS: Record<string, string> = {
		draft: 'Entwurf',
		in_review: 'In Prüfung',
		approved: 'Freigeschaltet',
		rejected: 'Abgelehnt'
	};

	function publicHref(event: PageData['events'][number]) {
		if (event.status !== 'approved' || !event.slug || !event.country) return null;
		return resolve('/[country]/veranstaltung/[slug]', {
			country: event.country as Country,
			slug: event.slug
		});
	}
</script>

<svelte:head>
	<title>Meine Veranstaltungen | dorfpartys.com</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main class="mx-auto max-w-[90ch]">
	<div class="header-row">
		<h1>Meine Veranstaltungen</h1>
		<Button href={resolve('/veranstaltung-eintragen')}>Neue Veranstaltung erstellen</Button>
	</div>

	{#if data.events.length === 0}
		<p class="empty">
			Du hast noch keine Veranstaltung eingetragen. Leg gleich deine erste Party an!
		</p>
	{:else}
		<div class="event-list">
			{#each data.events as event (event.id)}
				<div class="event-card">
					<div class="event-info">
						<div class="event-header">
							<h2>{event.title}</h2>
							<span class="status {event.status}">{STATUS_LABELS[event.status] ?? event.status}</span
							>
						</div>
						<p class="event-date">
							{new Date(event.startDate).toLocaleDateString('de-DE', {
								weekday: 'short',
								day: '2-digit',
								month: 'short',
								year: 'numeric'
							})}
						</p>
						<p class="event-location">
							{event.bundeslandName ?? 'Unbekanntes Bundesland'}, {event.kreisName ??
								'Unbekannter Kreis'}
						</p>
					</div>
					<div class="event-actions">
						{#if publicHref(event)}
							<a class="action-link" href={publicHref(event)}>Ansehen</a>
						{/if}
						<a
							class="action-link"
							href={resolve(`/veranstaltung-eintragen?id=${encodeURIComponent(event.id)}`)}
						>
							Bearbeiten
						</a>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</main>

<style>
	.header-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 32px;
	}

	.header-row h1 {
		margin: 0;
	}

	.empty {
		color: var(--color-muted);
		padding: 24px 0;
		border-top: 1px solid var(--color-border);
	}

	.event-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.event-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		padding: 12px 16px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-bg-alt);
	}

	.event-info {
		flex: 1;
		min-width: 0;
	}

	.event-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
	}

	.event-header h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.status {
		padding: 2px 6px;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		border-radius: 2px;
		white-space: nowrap;
	}

	.status.draft {
		background: var(--color-border);
		color: var(--color-muted);
	}

	.status.in_review {
		background: var(--color-warning, #fbbf24);
		color: var(--color-bg);
	}

	.status.approved {
		background: var(--color-primary);
		color: var(--color-bg);
	}

	.status.rejected {
		background: var(--color-danger, #ef4444);
		color: white;
	}

	.event-date {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-muted);
	}

	.event-location {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text);
	}

	.event-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
		flex-shrink: 0;
	}

	.action-link {
		padding: 6px 12px;
		font-size: 0.85rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
		border-radius: 3px;
		text-decoration: none;
		white-space: nowrap;
	}

	.action-link:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
</style>
