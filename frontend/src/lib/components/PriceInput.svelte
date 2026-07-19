<script lang="ts">
	import './form-field.css';

	interface Props {
		label?: string;
		id?: string;
		name?: string;
		value?: number;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		error?: string;
		min?: number;
		step?: number;
		currency?: string;
	}

	let {
		label,
		id,
		name,
		value = $bindable(undefined),
		placeholder = '0,00',
		required = false,
		disabled = false,
		error,
		min = 0,
		step = 0.01,
		currency = '€'
	}: Props = $props();

	const uid = $props.id();
	const inputId = $derived(id ?? `price-input-${uid}`);
</script>

<div class="field">
	{#if label}
		<label class="field-label" for={inputId}>{label}{required ? ' *' : ''}</label>
	{/if}
	<div class="field-control-wrap">
		<input
			class="field-control"
			id={inputId}
			{name}
			type="number"
			inputmode="decimal"
			{placeholder}
			{required}
			{disabled}
			{min}
			{step}
			bind:value
			aria-invalid={error ? 'true' : undefined}
		/>
		<span class="field-affix">{currency}</span>
	</div>
	{#if error}
		<p class="field-error">{error}</p>
	{/if}
</div>
