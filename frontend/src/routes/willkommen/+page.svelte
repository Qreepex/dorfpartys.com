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

<div class="mx-auto max-w-[52ch] py-8 pb-16">
	<p class="mb-1 text-[0.75rem] tracking-[0.08em] text-muted uppercase">
		Schritt {step} von {totalSteps}
	</p>
	<h1>Willkommen bei dorfpartys.com</h1>
	<p class="mb-6 text-muted">
		Bevor es losgeht, richten wir kurz dein Veranstalter-Profil ein - das dauert eine Minute.
	</p>

	<div
		class="mb-8 flex gap-1.5"
		role="progressbar"
		aria-valuenow={step}
		aria-valuemin="1"
		aria-valuemax={totalSteps}
	>
		{#each stepIndicators as i (i)}
			<span class="h-1 flex-1" class:bg-primary={i < step} class:bg-border={i >= step}></span>
		{/each}
	</div>

	<form method="POST" action="?/complete">
		<input type="hidden" name="redirectTo" value={data.redirectTo} />
		<input type="hidden" name="bio" value={bio} />
		<input type="hidden" name="websiteUrl" value={websiteUrl} />
		<input type="hidden" name="instagramUrl" value={instagramUrl} />

		<fieldset class="m-0 mb-6 border-none p-0" hidden={step !== 1}>
			<legend class="mb-4 p-0 font-display text-[1.2rem] font-bold"
				>Wie sollen wir dich nennen?</legend
			>
			<TextInput
				label="Anzeigename"
				name="displayName"
				bind:value={displayName}
				placeholder="z.B. Schützenverein Steinhorst"
				required
				maxlength={80}
				error={form?.fieldErrors?.displayName?.[0]}
			/>
			<p class="text-[0.85rem] text-muted">
				Das ist dein öffentlicher Name als Veranstalter:in - sichtbar auf jeder Party, die du
				einträgst, und auf deiner eigenen Veranstalter-Seite.
			</p>
		</fieldset>

		<fieldset class="m-0 mb-6 border-none p-0" hidden={step !== 2}>
			<legend class="mb-4 p-0 font-display text-[1.2rem] font-bold"
				>Erzähl uns kurz von dir (optional)</legend
			>
			<TextInput label="Website" type="url" bind:value={websiteUrl} placeholder="https://…" />
			<TextInput
				label="Instagram"
				type="url"
				bind:value={instagramUrl}
				placeholder="https://instagram.com/…"
			/>
			<label class="mt-4 block text-[0.85rem] text-muted">
				Kurzbeschreibung
				<textarea
					class="mt-1.5 block w-full resize-y border border-border bg-bg-alt px-3 py-2.5 font-body text-[0.95rem] text-text"
					maxlength="2000"
					bind:value={bio}
					rows="4"></textarea>
			</label>
			<p class="text-[0.85rem] text-muted">
				Kannst du auch jederzeit später in deinem Profil ergänzen.
			</p>
		</fieldset>

		<fieldset class="m-0 mb-6 border-none p-0" hidden={step !== 3}>
			<legend class="mb-4 p-0 font-display text-[1.2rem] font-bold">Fertig?</legend>
			<dl class="mb-4 border-y border-border py-4">
				<dt class="text-muted">Anzeigename</dt>
				<dd class="m-0 mb-3 text-right font-semibold">{displayName || '-'}</dd>
				{#if websiteUrl}
					<dt class="text-muted">Website</dt>
					<dd class="m-0 mb-3 text-right font-semibold">{websiteUrl}</dd>
				{/if}
				{#if instagramUrl}
					<dt class="text-muted">Instagram</dt>
					<dd class="m-0 text-right font-semibold">{instagramUrl}</dd>
				{/if}
			</dl>
			<p class="text-[0.85rem] text-muted">
				Damit bist du startklar. Du kannst dein Profil jederzeit unter „Mein Profil" anpassen.
			</p>
		</fieldset>

		<div class="flex flex-wrap gap-3">
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
			<Button type="submit" formaction="?/skip" formnovalidate variant="ghost"
				>Später einrichten</Button
			>
		</div>
	</form>
</div>
