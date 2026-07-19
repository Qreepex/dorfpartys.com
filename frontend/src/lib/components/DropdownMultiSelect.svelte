<script lang="ts">
	import './form-field.css';

	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		label?: string;
		id?: string;
		name?: string;
		value?: string[];
		options: Option[];
		placeholder?: string;
		disabled?: boolean;
		error?: string;
	}

	let {
		label,
		id,
		name,
		value = $bindable([]),
		options,
		placeholder = 'Alle',
		disabled = false,
		error
	}: Props = $props();

	const uid = $props.id();
	const controlId = $derived(id ?? `dropdown-multiselect-${uid}`);

	let open = $state(false);
	let root: HTMLDivElement | undefined = $state();

	function toggleOption(optionValue: string) {
		value = value.includes(optionValue)
			? value.filter((v) => v !== optionValue)
			: [...value, optionValue];
	}

	function handleWindowClick(event: MouseEvent) {
		if (open && root && !root.contains(event.target as Node)) {
			open = false;
		}
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			open = false;
		}
	}

	const summary = $derived(
		value.length === 0
			? placeholder
			: value.length === 1
				? (options.find((option) => option.value === value[0])?.label ?? placeholder)
				: `${value.length} ausgewählt`
	);
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />

<div class="field" bind:this={root}>
	{#if label}
		<span class="field-label" id={`${controlId}-label`}>{label}</span>
	{/if}
	<div class="multiselect">
		<button
			type="button"
			class="field-control multiselect-trigger"
			id={controlId}
			{disabled}
			aria-haspopup="listbox"
			aria-expanded={open}
			aria-labelledby={label ? `${controlId}-label` : undefined}
			onclick={() => (open = !open)}
		>
			<span>{summary}</span>
		</button>
		{#if open}
			<ul class="multiselect-panel" role="listbox" aria-multiselectable="true">
				{#each options as option (option.value)}
					<li>
						<label class="multiselect-option">
							<input
								type="checkbox"
								name={name ? `${name}[]` : undefined}
								value={option.value}
								checked={value.includes(option.value)}
								onchange={() => toggleOption(option.value)}
							/>
							<span>{option.label}</span>
						</label>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
	{#if error}
		<p class="field-error">{error}</p>
	{/if}
</div>

<style>
	.multiselect {
		position: relative;
	}

	.multiselect-trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		text-align: left;
		cursor: pointer;
	}

	.multiselect-trigger::after {
		content: '';
		width: 8px;
		height: 8px;
		border-right: 2px solid var(--color-text-muted);
		border-bottom: 2px solid var(--color-text-muted);
		transform: rotate(45deg);
		margin-left: 8px;
		flex: 0 0 auto;
	}

	.multiselect-panel {
		position: absolute;
		z-index: 20;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		margin: 0;
		padding: 4px 0;
		list-style: none;
		background: var(--color-bg-alt);
		border: 1px solid var(--color-border);
		border-radius: 2px;
		max-height: 240px;
		overflow-y: auto;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
	}

	.multiselect-option {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.multiselect-option:hover {
		background: var(--color-bg);
	}

	.multiselect-option input {
		accent-color: var(--color-primary);
		width: 16px;
		height: 16px;
	}
</style>
