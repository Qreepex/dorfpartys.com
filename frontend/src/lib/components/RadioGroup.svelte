<script lang="ts">
	interface Option {
		value: string;
		label: string;
		description?: string;
	}

	interface Props {
		legend?: string;
		name: string;
		options: Option[];
		value?: string;
		required?: boolean;
		disabled?: boolean;
		error?: string;
	}

	let {
		legend,
		name,
		options,
		value = $bindable(''),
		required = false,
		disabled = false,
		error
	}: Props = $props();

	const uid = $props.id();
	const errorId = `${uid}-error`;
</script>

<!--
	`aria-invalid` is only valid on roles that support it (see WAI-ARIA
	role-support table linked in the a11y_role_supports_aria_props_implicit
	warning) - the implicit role of a plain `<input type="radio">` is
	`radio`, which does NOT support `aria-invalid`. The group's validation
	state belongs on the group container instead, so this fieldset gets an
	explicit `role="radiogroup"` (which DOES support `aria-invalid`) plus
	`aria-describedby` pointing at the error message for screen readers.
-->
<fieldset
	class="radio-group"
	class:disabled
	{disabled}
	role="radiogroup"
	aria-invalid={error ? 'true' : undefined}
	aria-describedby={error ? errorId : undefined}
>
	{#if legend}
		<legend class="field-label">{legend}{required ? ' *' : ''}</legend>
	{/if}
	<div class="radio-options">
		{#each options as option (option.value)}
			<label class="radio-item">
				<input type="radio" {name} value={option.value} bind:group={value} {required} {disabled} />
				<span class="radio-control"></span>
				<div class="radio-label">
					<span class="radio-text">{option.label}</span>
					{#if option.description}
						<span class="radio-description">{option.description}</span>
					{/if}
				</div>
			</label>
		{/each}
	</div>
	{#if error}
		<p id={errorId} class="field-error">{error}</p>
	{/if}
</fieldset>

<style>
	.radio-group {
		border: none;
		padding: 0;
		margin: 0;
	}

	.radio-group.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.radio-group legend {
		display: block;
		margin-bottom: 12px;
	}

	.radio-options {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.radio-item {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		cursor: pointer;
		user-select: none;
	}

	.radio-item input {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}

	.radio-control {
		position: relative;
		flex: 0 0 auto;
		width: 20px;
		height: 20px;
		min-width: 20px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-alt);
		border-radius: 50%;
		transition:
			background 0.15s,
			border-color 0.15s;
		margin-top: 2px;
	}

	.radio-control::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 8px;
		height: 8px;
		background: var(--color-ink);
		border-radius: 50%;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.radio-item input:checked + .radio-control {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}

	.radio-item input:checked + .radio-control::after {
		opacity: 1;
	}

	.radio-item input:focus-visible + .radio-control {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.radio-label {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.radio-text {
		line-height: 1.3;
		font-weight: 500;
	}

	.radio-description {
		font-size: 0.85rem;
		color: var(--color-muted);
		line-height: 1.3;
	}

	:global(.field-error) {
		margin-top: 8px;
	}
</style>
