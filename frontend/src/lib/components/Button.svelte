<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLButtonAttributes & HTMLAnchorAttributes, 'type'> {
		variant?: 'primary' | 'secondary' | 'ghost';
		type?: 'button' | 'submit' | 'reset';
		href?: string;
		disabled?: boolean;
		fullWidth?: boolean;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	}

	let {
		variant = 'primary',
		type = 'button',
		href,
		disabled = false,
		fullWidth = false,
		onclick,
		children,
		class: className,
		...rest
	}: Props = $props();
</script>

{#if href}
	<a
		class="button button-{variant} {className}"
		class:full-width={fullWidth}
		class:disabled
		{href}
		aria-disabled={disabled}
		onclick={disabled ? (event) => event.preventDefault() : onclick}
		{...rest}
	>
		{@render children()}
	</a>
{:else}
	<button
		class="button button-{variant}"
		class:full-width={fullWidth}
		{type}
		{disabled}
		{onclick}
		{...rest}
	>
		{@render children()}
	</button>
{/if}

<style>
	.button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 44px;
		padding: 0 24px;
		border-radius: 3px;
		border: 1px solid transparent;
		font-family: 'Inter', system-ui, sans-serif;
		font-weight: 700;
		font-size: 0.95rem;
		text-decoration: none;
		cursor: pointer;
		transition:
			box-shadow 0.15s,
			border-color 0.15s,
			color 0.15s,
			opacity 0.15s,
			transform 0.05s;
	}

	.button.full-width {
		display: flex;
		width: 100%;
	}

	.button:active {
		transform: translateY(1px);
	}

	.button:disabled,
	.button.disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}

	.button-primary {
		background: var(--color-primary);
		color: var(--color-ink);
		box-shadow: 0 0 18px rgba(57, 230, 122, 0.35);
	}

	.button-primary:hover {
		box-shadow: 0 0 24px rgba(57, 230, 122, 0.55);
	}

	.button-secondary {
		background: var(--color-secondary);
		color: var(--color-ink);
		box-shadow: 0 0 18px rgba(255, 75, 62, 0.35);
	}

	.button-secondary:hover {
		box-shadow: 0 0 24px rgba(255, 75, 62, 0.55);
	}

	.button-ghost {
		background: transparent;
		color: var(--color-text);
		border-color: var(--color-border);
	}

	.button-ghost:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
</style>
