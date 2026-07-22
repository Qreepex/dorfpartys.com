<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import type { ResolveResult } from '@dorfpartys/shared';

	let { result }: { result: ResolveResult } = $props();

	let open = $state(true);

	// Chrome (from v129) renders closed <details> content via a `::details-content` pseudo
	// element with `content-visibility: hidden`, which CSS on the slotted children can no
	// longer override (unlike the old `details:not([open]) > *:not(summary) { display: none }`
	// UA rule). So instead of forcing visibility via CSS, the `open` attribute itself is driven
	// from a media query: expanded by default (SSR/no-JS), collapsed on mobile once JS confirms it.
	onMount(() => {
		const mq = window.matchMedia('(min-width: 768px)');
		const update = () => (open = mq.matches);
		update();
		mq.addEventListener('change', update);
		return () => mq.removeEventListener('change', update);
	});

	function segmentsPath(...slugs: Array<string | null | undefined>) {
		return slugs.filter((s): s is string => Boolean(s)).join('/');
	}
</script>

{#if result.navigationTree && (result.navigationTree.bundeslaender || result.navigationTree.kreise || result.navigationTree.partyArten)}
	<nav class="mb-6" aria-label="Filter Navigation">
		<!--
			`open` is driven from a `min-width: 768px` (md) media query in onMount, not CSS: collapsed
			by default on mobile, expanded as a fixed sidebar on md+. The summary click target is
			disabled on md+ so users can't collapse the "sidebar" there.
		-->
		<details {open} class="group bg-card rounded border border-border p-4">
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
			<div class="mt-4">
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
