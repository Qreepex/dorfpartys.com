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
		value?: string;
		options: Option[];
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		error?: string;
	}

	let {
		label,
		id,
		name,
		value = $bindable(''),
		options,
		placeholder = 'Alle',
		required = false,
		disabled = false,
		error
	}: Props = $props();

	const uid = $props.id();
	const selectId = $derived(id ?? `dropdown-select-${uid}`);
</script>

<div class="field">
	{#if label}
		<label class="field-label" for={selectId}>{label}{required ? ' *' : ''}</label>
	{/if}
	<select
		class="field-control"
		id={selectId}
		{name}
		{required}
		{disabled}
		bind:value
		aria-invalid={error ? 'true' : undefined}
	>
		{#if placeholder}
			<option value="">{placeholder}</option>
		{/if}
		{#each options as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
	{#if error}
		<p class="field-error">{error}</p>
	{/if}
</div>
