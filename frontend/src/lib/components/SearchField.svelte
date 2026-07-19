<script lang="ts">
	import './form-field.css';

	interface Props {
		label?: string;
		id?: string;
		name?: string;
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		onSubmit?: (value: string) => void;
	}

	let {
		label,
		id,
		name,
		value = $bindable(''),
		placeholder = 'Suchen…',
		disabled = false,
		onSubmit
	}: Props = $props();

	const uid = $props.id();
	const inputId = $derived(id ?? `search-field-${uid}`);

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			onSubmit?.(value);
		}
	}

	function clear() {
		value = '';
	}
</script>

<div class="field">
	{#if label}
		<label class="field-label" for={inputId}>{label}</label>
	{/if}
	<div class="field-control-wrap">
		<span class="field-affix" aria-hidden="true">
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			>
				<circle cx="11" cy="11" r="7" />
				<path d="m20 20-3.5-3.5" />
			</svg>
		</span>
		<input
			class="field-control"
			type="search"
			id={inputId}
			{name}
			{placeholder}
			{disabled}
			bind:value
			onkeydown={handleKeydown}
		/>
		{#if value}
			<button
				type="button"
				class="field-affix clear"
				aria-label="Suche zurücksetzen"
				onclick={clear}
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				>
					<path d="M6 6l12 12M18 6 6 18" />
				</svg>
			</button>
		{/if}
	</div>
</div>

<style>
	.clear {
		background: none;
		border: none;
		padding: 4px;
		margin: 0;
		cursor: pointer;
		color: var(--color-muted);
	}

	.clear:hover {
		color: var(--color-text);
	}

	:global(input[type='search']::-webkit-search-cancel-button) {
		display: none;
	}
</style>
