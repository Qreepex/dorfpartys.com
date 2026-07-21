<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, TextInput } from '$lib/components/index.js';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let ghostAccounts = $derived(data.ghostAccounts || []);
	let newDisplayName = $state('');
	let copiedCode = $state<string | null>(null);

	// Ausgangspunkt für den optionalen Direktlink `/willkommen?code=XXXX`
	// (AGENTS.md: "möglichst kleine Hürde" - Admin kann den Link statt des
	// bloßen Codes verschicken, das Onboarding-Feld ist dann vorausgefüllt).
	function inviteLink(code: string): string {
		return `${resolve('/willkommen')}?code=${encodeURIComponent(code)}`;
	}

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copiedCode = text;
			setTimeout(() => {
				if (copiedCode === text) copiedCode = null;
			}, 2000);
		} catch {
			// Clipboard-API evtl. nicht verfügbar (z.B. kein sicherer Kontext) -
			// der Code steht ohnehin sichtbar im Textfeld zum manuellen Kopieren.
		}
	}
</script>

<svelte:head>
	<title>Ghost-Accounts | Review | dorfpartys.com</title>
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

	<h2>Ghost-Accounts &amp; Einladungscodes</h2>
	<p class="mb-4 text-sm text-muted">
		Lege hier einen Platzhalter-Veranstalter an, um sofort Veranstaltungen für ihn einzutragen -
		bevor er sich selbst registriert hat. Generiere anschließend einen Einladungscode und schick ihn
		(oder den Direktlink) an den echten Veranstalter. Gibt er den Code beim Onboarding ein, werden
		alle Events des Ghost-Accounts automatisch auf seinen neuen Account übertragen und er gilt
		sofort als verifiziert - ohne weiteren Moderationsschritt.
	</p>

	{#if form?.action === 'createGhost' && form?.success}
		<p class="mb-6 border border-primary bg-bg-alt p-4 text-text">
			Ghost-Account „{form.displayName}" wurde angelegt.
		</p>
	{/if}
	{#if form?.action === 'generateCode' && form?.success && form.code}
		<div class="mb-6 border border-primary bg-bg-alt p-4">
			<p class="mb-2 font-semibold">Neuer Einladungscode erzeugt:</p>
			<div class="flex flex-wrap items-center gap-2">
				<input
					readonly
					value={form.code}
					class="bg-card border border-border px-3 py-2 font-mono text-lg tracking-[0.15em]"
					style="width: 12ch;"
					onclick={(e) => (e.target as HTMLInputElement).select()}
				/>
				<Button type="button" variant="secondary" onclick={() => copy(form.code)}>
					{copiedCode === form.code ? 'Kopiert ✓' : 'Code kopieren'}
				</Button>
				<Button type="button" variant="ghost" onclick={() => copy(inviteLink(form.code))}>
					{copiedCode === inviteLink(form.code) ? 'Kopiert ✓' : 'Direktlink kopieren'}
				</Button>
			</div>
		</div>
	{/if}
	{#if form?.action === 'generateCode' && form?.error}
		<p class="mb-6 border border-secondary bg-bg-alt p-4 text-secondary">{form.error}</p>
	{/if}

	<div class="bg-card mb-8 border border-border p-5">
		<h3 class="mb-3 text-lg font-semibold">Neuen Ghost-Account anlegen</h3>
		<form method="POST" action="?/createGhost" class="flex flex-wrap items-end gap-3">
			<div class="min-w-[16rem] flex-1">
				<TextInput
					label="Anzeigename des Veranstalters"
					name="displayName"
					bind:value={newDisplayName}
					placeholder="z.B. Schützenverein Steinhorst"
					required
					maxlength={80}
					error={form?.action === 'createGhost' ? form?.fieldErrors?.displayName?.[0] : undefined}
				/>
			</div>
			<Button type="submit">Anlegen</Button>
		</form>
	</div>

	<h3 class="mb-3 text-lg font-semibold">Bestehende Ghost-Accounts</h3>
	{#if ghostAccounts.length === 0}
		<p class="text-muted">Noch keine Ghost-Accounts angelegt.</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="border-b-2 border-border bg-bg-alt">
					<tr>
						<th class="px-4 py-3 text-left font-semibold">Veranstalter</th>
						<th class="px-4 py-3 text-left font-semibold">Events</th>
						<th class="px-4 py-3 text-left font-semibold">Einladungscode</th>
						<th class="px-4 py-3 text-right font-semibold">Aktionen</th>
					</tr>
				</thead>
				<tbody>
					{#each ghostAccounts as ghost (ghost.userId)}
						<tr class="border-b border-border hover:bg-bg-alt">
							<td class="px-4 py-3">
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
							</td>
							<td class="px-4 py-3">{ghost.eventCount}</td>
							<td class="px-4 py-3 text-xs">
								{#if ghost.invite}
									{#if ghost.invite.usedAt}
										<span class="text-muted">
											Eingelöst von
											{#if ghost.invite.usedBySlug}
												<a
													href={resolve('/veranstalter/[slug]', { slug: ghost.invite.usedBySlug })}
													class="text-primary no-underline hover:underline"
													target="_blank"
												>
													{ghost.invite.usedByDisplayName || 'Unbenannt'}
												</a>
											{:else}
												{ghost.invite.usedByDisplayName || 'Unbenannt'}
											{/if}
											am {new Date(ghost.invite.usedAt).toLocaleDateString('de-DE', {
												day: '2-digit',
												month: '2-digit',
												year: 'numeric'
											})}
										</span>
									{:else}
										<span class="font-mono tracking-[0.1em]">{ghost.invite.code}</span>
										<span class="ml-1 text-muted">(noch nicht eingelöst)</span>
									{/if}
								{:else}
									<span class="text-muted italic">Noch kein Code generiert</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-right">
								{#if !ghost.invite || ghost.invite.usedAt}
									<form method="POST" action="?/generateCode" style="display: contents;">
										<input type="hidden" name="ghostUserId" value={ghost.userId} />
										<Button
											type="submit"
											variant="secondary"
											style="font-size: 0.85rem; padding: 0.5rem 1rem;"
										>
											Code generieren
										</Button>
									</form>
								{:else}
									<form method="POST" action="?/generateCode" style="display: contents;">
										<input type="hidden" name="ghostUserId" value={ghost.userId} />
										<Button
											type="submit"
											variant="ghost"
											style="font-size: 0.85rem; padding: 0.5rem 1rem;"
										>
											Code neu generieren
										</Button>
									</form>
								{/if}
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
