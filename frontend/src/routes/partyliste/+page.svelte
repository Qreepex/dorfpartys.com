<script lang="ts">
	import { EventList } from '$lib/components/index.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Meine Partyliste | dorfpartys.com</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<h1>Meine Partyliste</h1>
<p class="lead">Alle Veranstaltungen, die du dir gemerkt hast.</p>

<section>
	<h2>Kommend</h2>
	<EventList events={data.upcoming} country="de">
		{#snippet itemExtra(item)}
			<form method="POST" action="?/unsave">
				<input type="hidden" name="eventId" value={item.eventId} />
				<button type="submit" class="remove">Entfernen</button>
			</form>
		{/snippet}
	</EventList>
</section>

{#if data.past.length > 0}
	<section>
		<h2>Vergangen</h2>
		<EventList events={data.past} country="de">
			{#snippet itemExtra(item)}
				<form method="POST" action="?/unsave">
					<input type="hidden" name="eventId" value={item.eventId} />
					<button type="submit" class="remove">Entfernen</button>
				</form>
			{/snippet}
		</EventList>
	</section>
{/if}

<style>
	.lead {
		color: var(--color-muted);
		margin-bottom: 32px;
	}

	section {
		margin-top: 32px;
	}

	section h2 {
		font-size: 1.3rem;
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
