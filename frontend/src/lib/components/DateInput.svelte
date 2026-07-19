<script lang="ts">
	import './form-field.css';

	interface Props {
		label?: string;
		id?: string;
		name?: string;
		value?: string;
		required?: boolean;
		disabled?: boolean;
		error?: string;
		min?: string;
		max?: string;
	}

	let {
		label,
		id,
		name,
		value = $bindable(''),
		required = false,
		disabled = false,
		error,
		min,
		max
	}: Props = $props();

	const uid = $props.id();
	const inputId = $derived(id ?? `date-input-${uid}`);
</script>

<div class="field">
	{#if label}
		<label class="field-label" for={inputId}>{label}{required ? ' *' : ''}</label>
	{/if}
	<input
		class="field-control date-control"
		id={inputId}
		{name}
		type="date"
		{required}
		{disabled}
		{min}
		{max}
		bind:value
		aria-invalid={error ? 'true' : undefined}
	/>
	{#if error}
		<p class="field-error">{error}</p>
	{/if}
</div>

<style>
	/* Native Kalender-Icon ist im Browser-Dark-Rendering oft schwarz-auf-dunkel; im Dark-Theme invertieren. */
	:global([data-theme='dark']) .date-control::-webkit-calendar-picker-indicator {
		filter: invert(1);
	}

	.date-control {
		cursor: pointer;
	}
</style>
