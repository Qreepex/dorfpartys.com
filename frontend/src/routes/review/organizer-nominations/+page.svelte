<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/index.js';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let nominations = $derived(data.nominations || []);
	let successMessage = $derived(
		form?.success
			? form.action === 'confirm'
				? 'Nominierung bestätigt ✓'
				: 'Nominierung abgelehnt'
			: null
	);
</script>

<svelte:head>
	<title>Organizer-Bestätigungen | Review | dorfpartys.com</title>
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
	</nav>

	<h2>Ausstehende Organizer-Nominierungen</h2>
	<p class="mb-4 text-sm text-muted">
		Beim Eintragen einer Veranstaltung wurde ein fremdes, bestehendes Profil als Veranstalter
		angegeben - die Zuordnung muss vom Profil-Inhaber oder einem Moderator bestätigt werden
		(AGENTS.md 5.3).
	</p>

	{#if successMessage}
		<p class="mb-6 border border-primary bg-bg-alt p-4 text-text">{successMessage}</p>
	{/if}

	{#if nominations.length === 0}
		<p class="text-muted">Keine ausstehenden Nominierungen.</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="border-b-2 border-border bg-bg-alt">
					<tr>
						<th class="px-4 py-3 text-left font-semibold">Event</th>
						<th class="px-4 py-3 text-left font-semibold">Nominierter Veranstalter</th>
						<th class="px-4 py-3 text-left font-semibold">Angefragt am</th>
						<th class="px-4 py-3 text-right font-semibold">Aktionen</th>
					</tr>
				</thead>
				<tbody>
					{#each nominations as nomination (nomination.id)}
						<tr class="border-b border-border hover:bg-bg-alt">
							<td class="px-4 py-3">{nomination.eventTitle}</td>
							<td class="px-4 py-3">
								{#if nomination.nominatedSlug}
									<a
										href={resolve('/veranstalter/[slug]', { slug: nomination.nominatedSlug })}
										class="text-primary no-underline hover:underline"
									>
										{nomination.nominatedDisplayName || 'Unbenannt'}
									</a>
								{:else}
									{nomination.nominatedDisplayName || 'Unbenannt'}
								{/if}
							</td>
							<td class="px-4 py-3 text-xs text-muted">
								{new Date(nomination.requestedAt).toLocaleDateString('de-DE', {
									day: '2-digit',
									month: '2-digit',
									year: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</td>
							<td class="px-4 py-3 text-right">
								<form method="POST" action="?/confirm" style="display: contents;">
									<input type="hidden" name="id" value={nomination.id} />
									<Button
										type="submit"
										variant="secondary"
										style="font-size: 0.85rem; padding: 0.5rem 1rem;"
									>
										✓ Bestätigen
									</Button>
								</form>
								<form
									method="POST"
									action="?/reject"
									style="display: contents; margin-left: 0.5rem;"
								>
									<input type="hidden" name="id" value={nomination.id} />
									<Button
										type="submit"
										variant="secondary"
										style="font-size: 0.85rem; padding: 0.5rem 1rem; color: #dc2626;"
									>
										✕ Ablehnen
									</Button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	table {
		border-collapse: collapse;
	}
</style>
