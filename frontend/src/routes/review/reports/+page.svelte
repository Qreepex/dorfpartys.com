<script lang="ts">
	import { resolve } from '$app/paths';
	import { REPORT_TYPES, SUBJECT_TYPES } from '@dorfpartys/shared';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let reports = $derived(data.reports || []);

	function typeLabel(type: string) {
		return REPORT_TYPES[type as keyof typeof REPORT_TYPES]?.label ?? type;
	}

	function subjectTypeLabel(subjectType: string) {
		return SUBJECT_TYPES[subjectType as keyof typeof SUBJECT_TYPES] ?? subjectType;
	}

	function formatDate(value: string | Date) {
		return new Date(value).toLocaleString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Reports | Review | dorfpartys.com</title>
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

	<h2>Gemeldete Inhalte</h2>
	<p class="mb-4 text-sm text-muted">
		Alle über "Inhalte melden" eingereichten Berichte, neueste zuerst. Rein informativ -
		Bearbeitung/ Freigabe erfolgt individuell außerhalb dieses Dashboards.
	</p>

	{#if reports.length === 0}
		<p class="text-muted">Bisher keine gemeldeten Inhalte.</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="border-b-2 border-border bg-bg-alt">
					<tr>
						<th class="px-4 py-3 text-left font-semibold">Typ</th>
						<th class="px-4 py-3 text-left font-semibold">Gemeldeter Inhalt</th>
						<th class="px-4 py-3 text-left font-semibold">Beschreibung</th>
						<th class="px-4 py-3 text-left font-semibold">Melder:in</th>
						<th class="px-4 py-3 text-left font-semibold">Status</th>
						<th class="px-4 py-3 text-left font-semibold">Eingereicht am</th>
					</tr>
				</thead>
				<tbody>
					{#each reports as r (r.id)}
						<tr class="border-b border-border align-top hover:bg-bg-alt">
							<td class="px-4 py-3">
								<span class="font-semibold">{typeLabel(r.type)}</span>
								<div class="text-xs text-muted">{subjectTypeLabel(r.subjectType)}</div>
							</td>
							<td class="px-4 py-3">
								{#if r.subjectEvent}
									<a
										href={r.subjectEvent.slug
											? resolve('/[country]/veranstaltung/[slug]', {
													country: r.subjectEvent.country,
													slug: r.subjectEvent.slug
												})
											: r.url}
										class="text-primary no-underline hover:underline"
										target="_blank"
										rel="noopener noreferrer"
									>
										{r.subjectEvent.title}
									</a>
								{:else if r.subjectProfile}
									<a
										href={r.subjectProfile.slug
											? resolve('/veranstalter/[slug]', { slug: r.subjectProfile.slug })
											: r.url}
										class="text-primary no-underline hover:underline"
										target="_blank"
										rel="noopener noreferrer"
									>
										{r.subjectProfile.displayName || 'Unbenannt'}
									</a>
								{:else}
									<!-- rel="external": vom Melder eingegebene URL, kein interner Route -->
									<a
										href={r.url}
										class="text-primary no-underline hover:underline"
										target="_blank"
										rel="external noopener noreferrer"
									>
										{r.url}
									</a>
								{/if}
								{#if r.subjectId}
									<div class="mt-0.5 font-mono text-xs text-muted">{r.subjectId}</div>
								{/if}
							</td>
							<td class="max-w-md px-4 py-3 whitespace-pre-line">{r.description}</td>
							<td class="px-4 py-3 text-xs text-muted">
								{#if r.reporterName || r.reporterEmail}
									{#if r.reporterName}<div>{r.reporterName}</div>{/if}
									{#if r.reporterEmail}<div>{r.reporterEmail}</div>{/if}
								{:else}
									anonym
								{/if}
							</td>
							<td class="px-4 py-3 text-xs text-muted uppercase">{r.status}</td>
							<td class="px-4 py-3 text-xs text-muted">{formatDate(r.createdAt)}</td>
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
