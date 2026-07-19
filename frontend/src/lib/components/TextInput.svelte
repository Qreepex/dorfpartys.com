<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import './form-field.css';

	interface Props {
		label?: string;
		id?: string;
		name?: string;
		value?: string;
		placeholder?: string;
		type?: 'text' | 'email' | 'tel' | 'url' | 'password';
		required?: boolean;
		disabled?: boolean;
		error?: string;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		maxlength?: number;
		minlength?: number;
	}

	let {
		label,
		id,
		name,
		value = $bindable(''),
		placeholder,
		type = 'text',
		required = false,
		disabled = false,
		error,
		autocomplete,
		maxlength,
		minlength
	}: Props = $props();

	const uid = $props.id();
	const inputId = $derived(id ?? `text-input-${uid}`);
</script>

<div class="field">
	{#if label}
		<label class="field-label" for={inputId}>{label}{required ? ' *' : ''}</label>
	{/if}
	<input
		class="field-control"
		id={inputId}
		{name}
		{type}
		{placeholder}
		{required}
		{disabled}
		{autocomplete}
		{maxlength}
		{minlength}
		bind:value
		aria-invalid={error ? 'true' : undefined}
	/>
	{#if error}
		<p class="field-error">{error}</p>
	{/if}
</div>
