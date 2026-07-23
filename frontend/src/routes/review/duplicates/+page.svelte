<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let deleteConfirm = $state<string | null>(null);

	const STATUS_LABELS: Record<string, string> = {
		draft: 'Entwurf',
		in_review: 'In Prüfung',
		approved: 'Freigeschaltet',
		rejected: 'Abgelehnt'
	};

	function formatDate(value: string | Date | null) {
		if (!value) return 'Termin folgt';
		return new Date(value).toLocaleDateString('de-DE', {
			weekday: 'short',
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			timeZone: 'Europe/Berlin'
		});
	}

	function formatScore(score: number) {
		return `${Math.round(score * 100)}% ähnlich`;
	}
</script>

<svelte:head>
	<title>Duplikate | Review | dorfpartys.com</title>
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
		<a href={resolve('/review/duplicates')} class="font-semibold text-primary">Duplikate</a>
		<a href={resolve('/review/reports')} class="font-semibold text-primary">Reports</a>
	</nav>

	<h2>Vermutete Duplikate</h2>
	<p class="mb-6 text-sm text-muted">
		Automatisch anhand von Namens-/Titel-Ähnlichkeit (und bei Veranstaltungen zusätzlich gleichem
		Kreis + nahem Datum) gefundene Kandidaten. Keine Liste ist final geprüft - erst nachsehen, dann
		ggf. löschen. Gelöschte Einträge verschwinden sofort aus beiden Listen.
	</p>

	<h3 class="mb-3 text-lg font-semibold">Ghost-Accounts</h3>
	{#if form?.action === 'deleteGhost' && form?.error}
		<p class="mb-4 border border-secondary bg-bg-alt p-4 text-secondary">{form.error}</p>
	{/if}
	{#if data.ghostAccountPairs.length === 0}
		<p class="mb-8 text-muted">Keine vermuteten Duplikate gefunden.</p>
	{:else}
		<div class="mb-8 flex flex-col gap-4">
			{#each data.ghostAccountPairs as pair, i (pair.a.userId + pair.b.userId)}
				<div class="bg-card border border-border p-5">
					<p class="mb-3 text-xs font-semibold tracking-[0.08em] text-muted uppercase">
						{formatScore(pair.score)}
					</p>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						{#each [pair.a, pair.b] as ghost (ghost.userId)}
							{@const confirmKey = `ghost:${i}:${ghost.userId}`}
							<div class="border border-border p-4">
								<p class="font-semibold">
									{#if ghost.slug}
										<a
											href={resolve('/veranstalter/[slug]', { slug: ghost.slug })}
											class="text-primary no-underline hover:underline"
											target="_blank"
										>
											{ghost.displayName || 'Unbenannt'}
										</a>
									{:else}
										{ghost.displayName || 'Unbenannt'}
									{/if}
								</p>
								<p class="mt-1 text-sm text-muted">
									{ghost.eventCount}
									{ghost.eventCount === 1 ? 'Veranstaltung' : 'Veranstaltungen'} · angelegt am {formatDate(
										ghost.createdAt
									)}
								</p>
								<div class="mt-3 flex flex-wrap gap-2">
									<a
										href={resolve('/review/ghost-accounts/[userId]', { userId: ghost.userId })}
										class="action-link">Veranstaltungen ansehen</a
									>
									<button
										type="button"
										class="action-link delete"
										onclick={() => (deleteConfirm = confirmKey)}
									>
										Löschen
									</button>
								</div>
								{#if deleteConfirm === confirmKey}
									<div class="delete-confirm mt-3">
										<p>
											{ghost.eventCount > 0
												? 'Hat noch Veranstaltungen - erst dort umhängen/löschen.'
												: 'Wirklich unwiderruflich löschen?'}
										</p>
										{#if ghost.eventCount === 0}
											<form method="POST" action="?/deleteGhost" class="confirm-actions">
												<input type="hidden" name="ghostUserId" value={ghost.userId} />
												<button type="submit" class="confirm-btn delete">Ja, löschen</button>
												<button
													type="button"
													class="confirm-btn cancel"
													onclick={() => (deleteConfirm = null)}
												>
													Abbrechen
												</button>
											</form>
										{:else}
											<button
												type="button"
												class="confirm-btn cancel"
												onclick={() => (deleteConfirm = null)}
											>
												Ok
											</button>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<h3 class="mb-3 text-lg font-semibold">Veranstaltungen</h3>
	{#if form?.action === 'deleteEvent' && form?.error}
		<p class="mb-4 border border-secondary bg-bg-alt p-4 text-secondary">{form.error}</p>
	{/if}
	{#if data.eventPairs.length === 0}
		<p class="text-muted">Keine vermuteten Duplikate gefunden.</p>
	{:else}
		<div class="flex flex-col gap-4">
			{#each data.eventPairs as pair, i (pair.a.id + pair.b.id)}
				<div class="bg-card border border-border p-5">
					<p class="mb-3 text-xs font-semibold tracking-[0.08em] text-muted uppercase">
						{formatScore(pair.score)}
					</p>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						{#each [pair.a, pair.b] as ev (ev.id)}
							{@const confirmKey = `event:${i}:${ev.id}`}
							<div class="border border-border p-4">
								<div class="flex items-start justify-between gap-2">
									<p class="font-semibold">{ev.title}</p>
									<span
										class="shrink-0 border border-border px-2 py-0.5 text-[0.7rem] font-semibold tracking-[0.06em] text-muted uppercase"
									>
										{STATUS_LABELS[ev.status] ?? ev.status}
									</span>
								</div>
								<p class="mt-1 text-sm text-muted">{formatDate(ev.startDate)}</p>
								<p class="mt-1 text-sm text-muted">
									{ev.kreisName ?? 'Unbekannter Kreis'}, {ev.bundeslandName ??
										'Unbekanntes Bundesland'}
									{#if ev.partyArtName}
										· {ev.partyArtName}
									{/if}
								</p>
								<p class="mt-1 text-sm text-muted">
									Veranstalter: {ev.organizerDisplayName ?? ev.organizerName ?? 'Unbenannt'}
								</p>
								<div class="mt-3 flex flex-wrap gap-2">
									{#if ev.slug && ev.country}
										<a
											href={resolve('/[country]/veranstaltung/[slug]', {
												country: ev.country,
												slug: ev.slug
											})}
											class="action-link"
											target="_blank">Ansehen</a
										>
									{/if}
									<a
										href={resolve(
											`/veranstaltung-eintragen?id=${encodeURIComponent(ev.id)}#formular`
										)}
										class="action-link"
									>
										Bearbeiten
									</a>
									<button
										type="button"
										class="action-link delete"
										onclick={() => (deleteConfirm = confirmKey)}
									>
										Löschen
									</button>
								</div>
								{#if deleteConfirm === confirmKey}
									<div class="delete-confirm mt-3">
										<p>Wirklich unwiderruflich löschen?</p>
										<form method="POST" action="?/deleteEvent" class="confirm-actions">
											<input type="hidden" name="eventId" value={ev.id} />
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
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
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

	.delete-confirm p {
		margin: 0 0 8px;
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
