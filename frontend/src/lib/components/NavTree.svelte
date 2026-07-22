<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ResolveResult } from '@dorfpartys/shared';

	let { result }: { result: ResolveResult } = $props();

	function segmentsPath(...slugs: Array<string | null | undefined>) {
		return slugs.filter((s): s is string => Boolean(s)).join('/');
	}
</script>

{#if result.navigationTree && (result.navigationTree.bundeslaender || result.navigationTree.kreise || result.navigationTree.partyArten)}
	<nav class="mb-6" aria-label="Filter Navigation">
		<!--
			<details>/<summary> collapses this by default on mobile, so users don't have to
			scroll past the whole nav tree before reaching the actual event list. On md+ it's a
			fixed sidebar again: the summary click target is disabled and the content is forced
			visible via `md:block!`, regardless of the (irrelevant there) open/closed state.
		-->
		<details class="group bg-card rounded border border-border p-4">
			<summary
				class="flex list-none items-center justify-between font-semibold md:pointer-events-none md:cursor-default [&::-webkit-details-marker]:hidden"
			>
				Navigation
				<svg
					class="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180 md:hidden"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="m6 9 6 6 6-6" />
				</svg>
			</summary>
			<div class="mt-4 md:block!">
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
			</div>
		</details>
	</nav>
{/if}
