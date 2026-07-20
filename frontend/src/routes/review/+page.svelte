<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const verificationHref = resolve('/review/verification');
</script>

<main class="mx-auto max-w-[90ch]">
	<h1>Review-Dashboard</h1>

	<nav class="mb-6 flex flex-wrap gap-3">
		<a href={resolve('/review')} class="font-semibold text-primary">Events</a>
		<a href={verificationHref} class="font-semibold text-primary">Verifizierung</a>
		<a href={resolve('/review/claims')} class="font-semibold text-primary">Event-Claims</a>
		<a href={resolve('/review/organizer-nominations')} class="font-semibold text-primary"
			>Organizer-Bestätigungen</a
		>
		<a href={resolve('/review/account-claims')} class="font-semibold text-primary">Profil-Claims</a>
	</nav>

	{#if form?.error}
		<p>{form.error}</p>
	{/if}

	{#if data.events.length === 0}
		<p>Aktuell keine Einreichungen zur Prüfung.</p>
	{:else}
		<ul>
			{#each data.events as event (event.id)}
				<li>
					<h2>{event.title}</h2>
					<p>{new Date(event.startDate).toLocaleString('de-DE')}</p>
					<p>{event.addressDescription}</p>
					<p>{event.description || '(keine Beschreibung)'}</p>

					<form method="POST" action="?/approve" style="display:inline">
						<input type="hidden" name="id" value={event.id} />
						<button type="submit">Freigeben</button>
					</form>
					<form method="POST" action="?/reject" style="display:inline">
						<input type="hidden" name="id" value={event.id} />
						<button type="submit">Ablehnen</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</main>
