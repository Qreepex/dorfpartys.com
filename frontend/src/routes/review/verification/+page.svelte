<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/index.js';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const reviewHref = resolve('/review');

	let requests = $derived(data.requests || []);
	let successMessage = $derived(
		form?.success
			? form.action === 'approve'
				? 'Verifizierung genehmigt ✓'
				: 'Verifizierung abgelehnt'
			: null
	);

	function guessMethod(req: (typeof requests)[0]): 'instagram' | 'tiktok' | 'email' {
		if (req.instagramUrl) return 'instagram';
		if (req.tiktokUrl) return 'tiktok';
		return 'email';
	}

	function getMethodLabel(method: 'instagram' | 'tiktok' | 'email'): string {
		const labels = { instagram: 'Instagram', tiktok: 'TikTok', email: 'E-Mail' };
		return labels[method];
	}
</script>

<svelte:head>
	<title>Verifizierung | Review | dorfpartys.com</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="max-w-6xl">
	<h1>Review-Dashboard</h1>

	<nav class="mb-6 flex flex-wrap gap-3">
		<a href={resolve('/review')} class="font-semibold text-primary">Events</a>
		<a href={reviewHref} class="font-semibold text-primary">Verifizierung</a>
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

	<h2>Verifizierungsanfragen</h2>

	{#if successMessage}
		<p class="mb-6 border border-primary bg-bg-alt p-4 text-text">{successMessage}</p>
	{/if}

	{#if requests.length === 0}
		<p class="text-muted">Keine ausstehenden Verifizierungsanfragen.</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="border-b-2 border-border bg-bg-alt">
					<tr>
						<th class="px-4 py-3 text-left font-semibold">Veranstalter</th>
						<th class="px-4 py-3 text-left font-semibold">Profil-URL</th>
						<th class="px-4 py-3 text-left font-semibold">Methode</th>
						<th class="px-4 py-3 text-left font-semibold">Code</th>
						<th class="px-4 py-3 text-left font-semibold">Angefordert am</th>
						<th class="px-4 py-3 text-right font-semibold">Aktionen</th>
					</tr>
				</thead>
				<tbody>
					{#each requests as req (req.userId)}
						<tr class="border-b border-border hover:bg-bg-alt">
							<td class="px-4 py-3">
								<a
									href={resolve('/veranstalter/[slug]', {
										slug: req.slug || req.displayName || ''
									})}
									class="text-primary no-underline hover:underline"
								>
									{req.displayName || 'Unnamed'}
								</a>
							</td>
							<td class="px-4 py-3 font-mono text-xs text-muted">
								{#if req.slug}
									<code>/veranstalter/{req.slug}</code>
								{:else}
									<span class="italic">Auto-generiert</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-xs">
								<span class="inline-block rounded bg-primary/10 px-2 py-1 text-primary">
									{getMethodLabel(guessMethod(req))}
								</span>
							</td>
							<td class="px-4 py-3 font-mono font-bold tracking-widest">{req.verificationCode}</td>
							<td class="px-4 py-3 text-xs text-muted">
								{#if req.verificationRequestedAt}
									{new Date(req.verificationRequestedAt).toLocaleDateString('de-DE', {
										day: '2-digit',
										month: '2-digit',
										year: 'numeric',
										hour: '2-digit',
										minute: '2-digit'
									})}
								{:else}
									–
								{/if}
							</td>
							<td class="px-4 py-3 text-right">
								<form
									method="POST"
									action="?/approve"
									style="display: contents;"
									onsubmit={() => confirm(`Verifizierung für ${req.displayName} genehmigen?`)}
								>
									<input type="hidden" name="userId" value={req.userId} />
									<input type="hidden" name="method" value={guessMethod(req)} />
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
									onsubmit={() => confirm(`Verifizierung für ${req.displayName} ablehnen?`)}
								>
									<input type="hidden" name="userId" value={req.userId} />
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
