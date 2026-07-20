<script lang="ts">
	import { EventList } from '$lib/components/index.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
	let deleteConfirm = $state<string | null>(null);
</script>

<svelte:head>
	<title>Meine Partyliste | dorfpartys.com</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main class="mx-auto max-w-[90ch]">
	<h1>Meine Partyliste</h1>

	{#if data.myEvents.length > 0}
		<section class="my-events">
			<h2>Meine Veranstaltungen</h2>
			<p class="lead">Veranstaltungen, die du eingereicht hast.</p>
			<div class="event-list">
				{#each data.myEvents as event (event.id)}
					<div class="event-card">
						<div class="event-info">
							<div class="event-header">
								<h3>{event.title}</h3>
								<span class="status {event.status}">{event.status}</span>
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
								{event.bundeslandName}, {event.kreisName}
							</p>
						</div>
						<div class="event-actions">
							<form method="POST" action="?/edit" class="inline">
								<input type="hidden" name="eventId" value={event.id} />
								<button type="submit" class="action-button edit">Bearbeiten</button>
							</form>
							<button
								type="button"
								class="action-button delete"
								onclick={() => (deleteConfirm = event.id)}
							>
								Löschen
							</button>
							{#if deleteConfirm === event.id}
								<div class="delete-confirm">
									<p>Sicher?</p>
									<form method="POST" action="?/delete" class="confirm-actions">
										<input type="hidden" name="eventId" value={event.id} />
										<button type="submit" class="confirm-btn delete">Ja, löschen</button>
										<button
											type="button"
											class="confirm-btn cancel"
											onclick={() => (deleteConfirm = null)}
										>
											Abbrechen
										</button>
									</form>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<section>
		<h2>Gemerkte Veranstaltungen</h2>
		<p class="lead">Alle Veranstaltungen, die du dir gemerkt hast.</p>

		<h3>Kommend</h3>
		<EventList events={data.upcoming} country="de">
			{#snippet itemExtra(item)}
				<form method="POST" action="?/unsave">
					<input type="hidden" name="eventId" value={item.eventId} />
					<button type="submit" class="remove">Entfernen</button>
				</form>
			{/snippet}
		</EventList>

		{#if data.past.length > 0}
			<h3>Vergangen</h3>
			<EventList events={data.past} country="de">
				{#snippet itemExtra(item)}
					<form method="POST" action="?/unsave">
						<input type="hidden" name="eventId" value={item.eventId} />
						<button type="submit" class="remove">Entfernen</button>
					</form>
				{/snippet}
			</EventList>
		{/if}
	</section>
</main>

<style>
	.lead {
		color: var(--color-muted);
		margin-bottom: 32px;
	}

	section {
		margin-top: 48px;
	}

	section h2 {
		font-size: 1.3rem;
		margin-bottom: 8px;
	}

	section h3 {
		font-size: 1.1rem;
		margin-top: 24px;
		margin-bottom: 12px;
	}

	.my-events {
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 32px;
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

	.event-header h3 {
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

	.inline {
		display: contents;
	}

	.action-button {
		padding: 6px 12px;
		font-size: 0.85rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
		border-radius: 3px;
		cursor: pointer;
		white-space: nowrap;
	}

	.action-button:hover {
		border-color: var(--color-text);
	}

	.action-button.edit:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.action-button.delete:hover {
		border-color: #ef4444;
		color: #ef4444;
	}

	.delete-confirm {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.delete-confirm p {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 500;
	}

	.confirm-actions {
		display: flex;
		gap: 4px;
	}

	.confirm-btn {
		padding: 4px 8px;
		font-size: 0.75rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		border-radius: 3px;
		cursor: pointer;
	}

	.confirm-btn.delete {
		border-color: #ef4444;
		color: #ef4444;
	}

	.confirm-btn.delete:hover {
		background: #ef4444;
		color: white;
	}

	.confirm-btn.cancel {
		color: var(--color-muted);
	}

	.confirm-btn.cancel:hover {
		border-color: var(--color-muted);
	}

	.remove {
		flex: 0 0 auto;
		background: none;
		border: 1px solid var(--color-border);
		color: var(--color-muted);
		font-size: 0.78rem;
		padding: 6px 10px;
		cursor: pointer;
	}

	.remove:hover {
		border-color: var(--color-secondary);
		color: var(--color-secondary);
	}
</style>
