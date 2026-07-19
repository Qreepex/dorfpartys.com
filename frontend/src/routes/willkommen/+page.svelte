<script lang="ts">
	import { Button, TextInput } from '$lib/components/index.js';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let step = $state(1);
	const totalSteps = 3;
	const stepIndicators = [0, 1, 2];

	let displayName = $state('');
	let bio = $state('');
	let websiteUrl = $state('');
	let instagramUrl = $state('');

	const canContinueFromStep1 = $derived(displayName.trim().length > 0);

	function next() {
		if (step === 1 && !canContinueFromStep1) return;
		step = Math.min(step + 1, totalSteps);
	}
	function back() {
		step = Math.max(step - 1, 1);
	}
</script>

<svelte:head>
	<title>Willkommen bei dorfpartys.com</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="onboarding">
	<p class="eyebrow">Schritt {step} von {totalSteps}</p>
	<h1>Willkommen bei dorfpartys.com</h1>
	<p class="lead">
		Bevor es losgeht, richten wir kurz dein Veranstalter-Profil ein — das dauert eine Minute.
	</p>

	<div
		class="progress"
		role="progressbar"
		aria-valuenow={step}
		aria-valuemin="1"
		aria-valuemax={totalSteps}
	>
		{#each stepIndicators as i (i)}
			<span class="bar" class:active={i < step}></span>
		{/each}
	</div>

	<form method="POST" action="?/complete">
		<input type="hidden" name="redirectTo" value={data.redirectTo} />
		<input type="hidden" name="bio" value={bio} />
		<input type="hidden" name="websiteUrl" value={websiteUrl} />
		<input type="hidden" name="instagramUrl" value={instagramUrl} />

		<fieldset hidden={step !== 1}>
			<legend>Wie sollen wir dich nennen?</legend>
			<TextInput
				label="Anzeigename"
				name="displayName"
				bind:value={displayName}
				placeholder="z.B. Schützenverein Steinhorst"
				required
				maxlength={80}
				error={form?.fieldErrors?.displayName?.[0]}
			/>
			<p class="hint">
				Das ist dein öffentlicher Name als Veranstalter:in — sichtbar auf jeder Party, die du
				einträgst, und auf deiner eigenen Veranstalter-Seite.
			</p>
		</fieldset>

		<fieldset hidden={step !== 2}>
			<legend>Erzähl uns kurz von dir (optional)</legend>
			<TextInput label="Website" type="url" bind:value={websiteUrl} placeholder="https://…" />
			<TextInput
				label="Instagram"
				type="url"
				bind:value={instagramUrl}
				placeholder="https://instagram.com/…"
			/>
			<label class="bio-field">
				Kurzbeschreibung
				<textarea maxlength="2000" bind:value={bio} rows="4"></textarea>
			</label>
			<p class="hint">Kannst du auch jederzeit später in deinem Profil ergänzen.</p>
		</fieldset>

		<fieldset hidden={step !== 3}>
			<legend>Fertig?</legend>
			<dl class="summary">
				<div>
					<dt>Anzeigename</dt>
					<dd>{displayName || '—'}</dd>
				</div>
				{#if websiteUrl}<div>
						<dt>Website</dt>
						<dd>{websiteUrl}</dd>
					</div>{/if}
				{#if instagramUrl}<div>
						<dt>Instagram</dt>
						<dd>{instagramUrl}</dd>
					</div>{/if}
			</dl>
			<p class="hint">
				Damit bist du startklar. Du kannst dein Profil jederzeit unter „Mein Profil" anpassen.
			</p>
		</fieldset>

		<div class="actions">
			{#if step > 1}
				<Button type="button" variant="ghost" onclick={back}>Zurück</Button>
			{/if}
			{#if step < totalSteps}
				<Button type="button" onclick={next} disabled={step === 1 && !canContinueFromStep1}>
					Weiter
				</Button>
			{:else}
				<Button type="submit">Fertig einrichten</Button>
			{/if}
			<Button type="submit" formaction="?/skip" formnovalidate variant="ghost">
				Später einrichten
			</Button>
		</div>
	</form>
</div>

<style>
	.onboarding {
		max-width: 52ch;
		margin: 0 auto;
		padding: 32px 0 64px;
	}

	.eyebrow {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-muted);
		margin: 0 0 4px;
	}

	.lead {
		color: var(--color-muted);
		margin-bottom: 24px;
	}

	.progress {
		display: flex;
		gap: 6px;
		margin-bottom: 32px;
	}

	.bar {
		flex: 1;
		height: 4px;
		background: var(--color-border);
	}

	.bar.active {
		background: var(--color-primary);
	}

	fieldset {
		border: none;
		padding: 0;
		margin: 0 0 24px;
	}

	legend {
		font-family: 'Fraunces', Georgia, serif;
		font-weight: 700;
		font-size: 1.2rem;
		padding: 0;
		margin-bottom: 16px;
	}

	.hint {
		color: var(--color-muted);
		font-size: 0.85rem;
	}

	.bio-field {
		display: block;
		font-size: 0.85rem;
		color: var(--color-muted);
		margin-top: 16px;
	}

	.bio-field textarea {
		display: block;
		width: 100%;
		margin-top: 6px;
		padding: 10px 12px;
		background: var(--color-bg-alt);
		border: 1px solid var(--color-border);
		color: var(--color-text);
		font-family: 'Inter', system-ui, sans-serif;
		font-size: 0.95rem;
		resize: vertical;
	}

	.summary {
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
		padding: 16px 0;
		margin: 0 0 16px;
	}

	.summary div {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 4px 0;
	}

	.summary dt {
		color: var(--color-muted);
	}

	.summary dd {
		margin: 0;
		font-weight: 600;
		text-align: right;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}
</style>
