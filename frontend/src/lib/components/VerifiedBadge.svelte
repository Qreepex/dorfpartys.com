<script lang="ts">
	let { title = 'Verifizierter Veranstalter' }: { title?: string } = $props();
</script>

<span
	class="verified-badge"
	title={title}
	aria-label="Verifiziert"
>
	<svg
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="3"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<polyline points="20 6 9 17 4 12"></polyline>
	</svg>
</span>

<style>
	.verified-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1em;
		height: 1em;
		color: #10b981;
		flex-shrink: 0;
	}

	svg {
		width: 100%;
		height: 100%;
	}
</style>
