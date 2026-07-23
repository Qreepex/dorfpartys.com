<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, TextInput } from '$lib/components/index.js';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let deleteConfirm = $state<string | null>(null);
	let displayNameInput = $derived(data.ghost.displayName ?? '');

	const STATUS_LABELS: Record<string, string> = {
		draft: 'Entwurf',
		in_review: 'In Prüfung',
		approved: 'Freigeschaltet',
		rejected: 'Abgelehnt'
	};
</script>

<svelte:head>
	<title
		>{data.ghost.displayName ?? 'Ghost-Account'} | Ghost-Accounts | Review | dorfpartys.com</title
	>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="max-w-6xl">
	<h1>Review-Dashboard</h1>

	<nav class="mb-6 flex flex-wrap gap-3">
		<a href={resolve('/review')} class="font-semibold text-primary">Events</a>
		<a href={resolve('/review/verification')} class="font-semibold text-primary">Verifizierung</a>
		<a href={resolve('/review/claims')} class="font-semibold text-primary">Event-Claims</a>
		<a href={resolve('/review/organizer-nominations')} class="font-semibold text-primary"
			>Organizer-Bestätigungen</a
		>
		<a href={resolve('/review/account-claims')} class="font-semibold text-primary">Profil-Claims</a>
		<a href={resolve('/review/ghost-accounts')} class="font-semibold text-primary">Ghost-Accounts</a
		>
		<a href={resolve('/review/reports')} class="font-semibold text-primary">Reports</a>
	</nav>

	<p class="mb-4 text-sm">
		<a href={resolve('/review/ghost-accounts')} class="text-primary no-underline hover:underline"
			>&larr; Zurück zu allen Ghost-Accounts</a
		>
	</p>

	<h2>
		Ghost-Account: {data.ghost.displayName || 'Unbenannt'}
	</h2>
	{#if data.ghost.slug}
		<p class="mb-4 text-sm text-muted">
			<a
				href={resolve('/veranstalter/[slug]', { slug: data.ghost.slug })}
				class="text-primary no-underline hover:underline"
				target="_blank"
			>
				Öffentliches Profil ansehen
			</a>
		</p>
	{/if}

	{#if form?.action === 'rename' && form?.success}
		<p class="mb-4 border border-primary bg-bg-alt p-4 text-text">Anzeigename wurde geändert.</p>
	{/if}
	{#if form?.action === 'rename' && form?.error}
		<p class="mb-4 border border-secondary bg-bg-alt p-4 text-secondary">{form.error}</p>
	{/if}

	<div class="bg-card mb-8 border border-border p-5">
		<h3 class="mb-3 text-lg font-semibold">Ghost-Account bearbeiten</h3>
		<form method="POST" action="?/rename" class="flex flex-wrap items-end gap-3">
			<div class="min-w-[16rem] flex-1">
				<TextInput
					label="Anzeigename des Veranstalters"
					name="displayName"
					bind:value={displayNameInput}
					required
					maxlength={80}
					error={form?.action === 'rename' ? form?.fieldErrors?.displayName?.[0] : undefined}
				/>
			</div>
			<Button type="submit">Speichern</Button>
		</form>
	</div>

	<h3 class="mb-3 text-lg font-semibold">Veranstaltungen</h3>
	{#if form?.action === 'delete' && form?.error}
		<p class="mb-4 border border-secondary bg-bg-alt p-4 text-secondary">{form.error}</p>
	{/if}

	{#if data.events.length === 0}
		<p class="text-muted">Dieser Ghost-Account hat noch keine Veranstaltungen.</p>
	{:else}
		<div class="event-list">
			{#each data.events as event (event.id)}
				<div class="event-card">
					<div class="event-info">
						<div class="event-header">
							<h3>{event.title}</h3>
							<span class="status {event.status}"
								>{STATUS_LABELS[event.status] ?? event.status}</span
							>
						</div>
						<p class="event-date">
							{#if event.startDate}
								{new Date(event.startDate).toLocaleDateString('de-DE', {
									weekday: 'short',
									day: '2-digit',
									month: 'short',
									year: 'numeric',
									timeZone: 'Europe/Berlin'
								})}
							{:else}
								Termin folgt
							{/if}
						</p>
						<p class="event-location">
							{event.bundeslandName ?? 'Unbekanntes Bundesland'}, {event.kreisName ??
								'Unbekannter Kreis'}
							{#if event.partyArtName}
								&middot; {event.partyArtName}
							{/if}
						</p>
					</div>
					<div class="event-actions">
						<a
							class="action-link"
							href={resolve(`/veranstaltung-eintragen?id=${encodeURIComponent(event.id)}#formular`)}
						>
							Bearbeiten
						</a>
						<button
							type="button"
							class="action-link delete"
							onclick={() => (deleteConfirm = event.id)}
						>
							Löschen
						</button>
						{#if deleteConfirm === event.id}
							<div class="delete-confirm">
								<p>Wirklich unwiderruflich löschen?</p>
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
	{/if}
</div>

<style>
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
		flex-wrap: wrap;
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

	.action-link {
		padding: 6px 12px;
		font-size: 0.85rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
		border-radius: 3px;
		text-decoration: none;
		white-space: nowrap;
		cursor: pointer;
	}

	.action-link:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.action-link.delete:hover {
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
</style>
