<script lang="ts">
	interface Props {
		label?: string;
		id?: string;
		name?: string;
		checked?: boolean;
		variant?: 'checkbox' | 'switch';
		required?: boolean;
		disabled?: boolean;
	}

	let {
		label,
		id,
		name,
		checked = $bindable(false),
		variant = 'checkbox',
		required = false,
		disabled = false
	}: Props = $props();

	const uid = $props.id();
	const inputId = $derived(id ?? `toggle-${uid}`);
</script>

<label class="toggle toggle-{variant}" class:disabled for={inputId}>
	<input type="checkbox" id={inputId} {name} {required} {disabled} bind:checked />
	<span class="control" aria-hidden="true"></span>
	{#if label}
		<span class="label-text">{label}</span>
	{/if}
</label>

<style>
	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		cursor: pointer;
		font-family: 'Inter', system-ui, sans-serif;
		font-size: 0.9rem;
		color: var(--color-text);
		user-select: none;
	}

	.toggle.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toggle input {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}

	/* Checkbox: eckig, Haarlinien-Border statt Schatten (DESIGN.md 5) */
	.toggle-checkbox .control {
		position: relative;
		flex: 0 0 auto;
		width: 22px;
		height: 22px;
		min-width: 22px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-alt);
		border-radius: 2px;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.toggle-checkbox .control::after {
		content: '';
		position: absolute;
		left: 7px;
		top: 3px;
		width: 6px;
		height: 11px;
		border-right: 2px solid var(--color-ink);
		border-bottom: 2px solid var(--color-ink);
		transform: rotate(45deg);
		opacity: 0;
	}

	.toggle-checkbox input:checked + .control {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}

	.toggle-checkbox input:checked + .control::after {
		opacity: 1;
	}

	/* Switch: rechteckige Schiene, bewusst nicht pill-förmig (DESIGN.md 1: keine Pill-Optik) */
	.toggle-switch .control {
		position: relative;
		flex: 0 0 auto;
		width: 40px;
		height: 22px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-alt);
		border-radius: 2px;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.toggle-switch .control::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		background: var(--color-muted);
		border-radius: 1px;
		transition:
			transform 0.15s,
			background 0.15s;
	}

	.toggle-switch input:checked + .control {
		border-color: var(--color-primary);
	}

	.toggle-switch input:checked + .control::after {
		transform: translateX(18px);
		background: var(--color-primary);
	}

	.toggle input:focus-visible + .control {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.label-text {
		line-height: 1.3;
	}
</style>
