<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/index.js';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let claims = $derived(data.claims || []);
	let successMessage = $derived(
		form?.success
			? form.action === 'approve'
				? 'Profil-Übernahme genehmigt ✓'
				: 'Anfrage abgelehnt'
			: null
	);
</script>

<svelte:head>
	<title>Profil-Claims | Review | dorfpartys.com</title>
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
	</nav>

	<h2>Ausstehende Profil-Übernahmen (Ghost-Accounts)</h2>
	<p class="mb-4 text-sm text-muted">
		Ein verifizierter Veranstalter möchte einen nicht registrierten Veranstalter-Eintrag (Ghost-
		Account) übernehmen. Bei Genehmigung werden alle Events des Ghost-Accounts auf ihn übertragen.
	</p>

	{#if successMessage}
		<p class="mb-6 border border-primary bg-bg-alt p-4 text-text">{successMessage}</p>
	{/if}

	{#if claims.length === 0}
		<p class="text-muted">Keine ausstehenden Profil-Übernahmen.</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="border-b-2 border-border bg-bg-alt">
					<tr>
						<th class="px-4 py-3 text-left font-semibold">Ghost-Profil</th>
						<th class="px-4 py-3 text-left font-semibold">Events</th>
						<th class="px-4 py-3 text-left font-semibold">Übernommen von</th>
						<th class="px-4 py-3 text-left font-semibold">Grund</th>
						<th class="px-4 py-3 text-left font-semibold">Angefragt am</th>
						<th class="px-4 py-3 text-right font-semibold">Aktionen</th>
					</tr>
				</thead>
				<tbody>
					{#each claims as claim (claim.id)}
						<tr class="border-b border-border hover:bg-bg-alt">
							<td class="px-4 py-3">
								{#if claim.ghostSlug}
									<a
										href={resolve('/veranstalter/[slug]', { slug: claim.ghostSlug })}
										class="text-primary no-underline hover:underline"
									>
										{claim.ghostDisplayName || 'Unbenannt'}
									</a>
								{:else}
									{claim.ghostDisplayName || 'Unbenannt'}
								{/if}
							</td>
							<td class="px-4 py-3">{claim.ghostEventCount}</td>
							<td class="px-4 py-3">
								{#if claim.claimedBySlug}
									<a
										href={resolve('/veranstalter/[slug]', { slug: claim.claimedBySlug })}
										class="text-primary no-underline hover:underline"
									>
										{claim.claimedByDisplayName || 'Unbenannt'}
									</a>
								{:else}
									{claim.claimedByDisplayName || 'Unbenannt'}
								{/if}
							</td>
							<td class="px-4 py-3 text-xs text-muted">{claim.reason || '–'}</td>
							<td class="px-4 py-3 text-xs text-muted">
								{new Date(claim.requestedAt).toLocaleDateString('de-DE', {
									day: '2-digit',
									month: '2-digit',
									year: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</td>
							<td class="px-4 py-3 text-right">
								<form method="POST" action="?/approve" style="display: contents;">
									<input type="hidden" name="id" value={claim.id} />
									<Button
										type="submit"
										variant="secondary"
										style="font-size: 0.85rem; padding: 0.5rem 1rem;"
									>
										✓ Genehmigen
									</Button>
								</form>
								<form
									method="POST"
									action="?/reject"
									style="display: contents; margin-left: 0.5rem;"
								>
									<input type="hidden" name="id" value={claim.id} />
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
