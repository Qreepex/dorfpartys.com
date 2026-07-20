<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ResolveResult } from '@dorfpartys/shared';

	let { result }: { result: ResolveResult } = $props();

	function segmentsPath(...slugs: Array<string | null | undefined>) {
		return slugs.filter((s): s is string => Boolean(s)).join('/');
	}
</script>

{#if result.navigationTree && (result.navigationTree.bundeslaender || result.navigationTree.kreise || result.navigationTree.partyArten)}
	<nav class="bg-card mb-6 rounded border border-border p-4" aria-label="Filter Navigation">
		<h3 class="mb-4 font-semibold">Navigation</h3>

		{#if result.navigationTree.bundeslaender && result.navigationTree.bundeslaender.length > 0}
			<div class="mb-6">
				<h4 class="text-md mb-2 font-medium text-muted">Regionen</h4>
				<ul class="space-y-1">
					{#each result.navigationTree.bundeslaender.sort((a, b) => {
						const diff = b.eventCount - a.eventCount;
						if (diff === 0) return a.name.localeCompare(b.name);
						return diff;
					}) as item (item.slug)}
						<li>
							<a
								href={resolve('/[country]/[...segments]', {
									country: result.filters.country,
									segments: segmentsPath(item.slug)
								})}
								class={`block rounded px-2 py-1 text-sm transition-colors ${
									item.eventCount > 0
										? 'hover:bg-accent text-primary'
										: 'cursor-not-allowed text-muted opacity-50'
								}`}
								class:cursor-not-allowed={item.eventCount === 0}
								aria-disabled={item.eventCount === 0}
							>
								{item.name}
								<span class="text-xs text-muted">({item.eventCount})</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if result.navigationTree.kreise && result.navigationTree.kreise.length > 0}
			<div class="mb-6">
				<h4 class="text-md mb-2 font-medium text-muted">Partys in</h4>
				<ul class="space-y-1">
					{#each result.navigationTree.kreise.sort((a, b) => {
						const diff = b.eventCount - a.eventCount;
						if (diff === 0) return a.name.localeCompare(b.name);
						return diff;
					}) as item (item.slug)}
						<li>
							<a
								href={resolve('/[country]/[...segments]', {
									country: result.filters.country,
									segments: segmentsPath(result.filters.bundeslandSlug, item.slug)
								})}
								class={`block rounded px-2 py-1 text-sm transition-colors ${
									item.eventCount > 0
										? 'hover:bg-accent text-primary'
										: 'cursor-not-allowed text-muted opacity-50'
								}`}
								class:cursor-not-allowed={item.eventCount === 0}
								aria-disabled={item.eventCount === 0}
							>
								{item.name}
								<span class="text-xs text-muted">({item.eventCount})</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if result.navigationTree.partyArten && result.navigationTree.partyArten.length > 0}
			<div>
				<h4 class="text-md mb-2 font-medium text-muted">Veranstaltungsarten</h4>
				<ul class="space-y-1">
					{#each result.navigationTree.partyArten.sort((a, b) => {
						const diff = b.eventCount - a.eventCount;
						if (diff === 0) return a.name.localeCompare(b.name);
						return diff;
					}) as item (item.slug)}
						<li>
							<a
								href={resolve('/[country]/[...segments]', {
									country: result.filters.country,
									segments: segmentsPath(
										result.filters.bundeslandSlug,
										result.filters.kreisSlug,
										item.slug
									)
								})}
								class={`block rounded px-2 py-1 text-sm transition-colors ${
									item.eventCount > 0
										? 'hover:bg-accent text-primary'
										: 'cursor-not-allowed text-muted opacity-50'
								}`}
								class:cursor-not-allowed={item.eventCount === 0}
								aria-disabled={item.eventCount === 0}
							>
								{item.name}
								<span class="text-xs text-muted">({item.eventCount})</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</nav>
{/if}
