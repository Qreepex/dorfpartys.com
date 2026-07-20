<script lang="ts">
	import type { EventLinkType } from '@dorfpartys/shared';

	let { type }: { type: EventLinkType } = $props();
</script>

<span class="link-type-icon" aria-hidden="true">
	{#if type === 'tiktok'}
		<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
			<path
				d="M16.6 3h-3.2v12.4a2.9 2.9 0 1 1-2.05-2.77V9.3a6.1 6.1 0 1 0 5.25 6.05V9.75a7.6 7.6 0 0 0 4.4 1.4V8a4.4 4.4 0 0 1-4.4-4.4V3Z"
			/>
		</svg>
	{:else if type === 'instagram'}
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<rect x="3" y="3" width="18" height="18" rx="5" />
			<circle cx="12" cy="12" r="4" />
			<circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
		</svg>
	{:else if type === 'facebook'}
		<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
			<path
				d="M13.5 21v-7.9h2.65l.4-3.08H13.5V8.06c0-.89.25-1.5 1.53-1.5h1.63V3.84A22 22 0 0 0 14.3 3.7c-2.36 0-3.98 1.44-3.98 4.08v2.24H7.65v3.08h2.67V21h3.18Z"
			/>
		</svg>
	{:else}
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<circle cx="12" cy="12" r="9" />
			<path d="M3 12h18" />
			<path d="M12 3a15 15 0 0 1 0 18" />
			<path d="M12 3a15 15 0 0 0 0 18" />
		</svg>
	{/if}
</span>

<style>
	.link-type-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1em;
		height: 1em;
		flex-shrink: 0;
	}

	svg {
		width: 100%;
		height: 100%;
	}
</style>
