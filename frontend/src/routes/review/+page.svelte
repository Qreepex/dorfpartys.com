<script lang="ts">
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<h1>Review-Dashboard</h1>

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
				<p>{event.description}</p>

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
