<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import '$lib/components/form-field.css';
	import ImageUpload from '$lib/components/ImageUpload.svelte';
	import {
		Button,
		DropdownSelect,
		FormGrid,
		RadioGroup,
		TextInput,
		Toggle,
		VerifiedBadge
	} from '$lib/components/index.js';
	import { SITE_URL } from '@dorfpartys/shared';
	import type { ActionResult } from '@sveltejs/kit';
	import type { ActionData, PageData } from './$types.js';

	let { data, form: initialForm }: { data: PageData; form: ActionData } = $props();

	let form = $state(initialForm);
	let submitStatus = $state<'idle' | 'submitting' | 'success' | 'error'>('idle');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (organizerMode === 'myself' && !data.isProfilePublic) {
			return;
		}
		if (organizerMode === 'profile' && !organizerUserId) {
			organizerError = 'Bitte wähle ein Profil aus der Ergebnisliste aus.';
			return;
		}
		organizerError = '';

		const formEl = event.currentTarget as HTMLFormElement;
		submitStatus = 'submitting';

		try {
			const response = await fetch(formEl.action, {
				method: 'POST',
				body: new FormData(formEl)
			});
			const result: ActionResult = deserialize(await response.text());

			if (result.type === 'success') {
				submitStatus = 'success';
				form = result.data as ActionData;
			} else if (result.type === 'failure') {
				submitStatus = 'error';
				form = result.data as ActionData;
			} else {
				submitStatus = 'idle';
			}

			await applyAction(result);
		} catch {
			submitStatus = 'error';
		}
	}

	const loginHref = $derived(
		`${resolve('/auth/login')}?redirectTo=${encodeURIComponent(page.url.pathname)}`
	);

	let title = $state('');
	let description = $state('');
	let startDate = $state('');
	let endDate = $state('');
	let bundeslandId = $state('');
	let kreisId = $state('');
	let partyArtId = $state('');
	let addressDescription = $state('');
	let uploadedPhotoS3Key = $state<string | null>(null);

	// Organizer selection state
	let organizerMode = $state<'myself' | 'profile' | 'freetext'>('myself');
	let organizerUserId = $state('');
	let organizerName = $state('');

	// Live-Suche für "Anderes öffentliches Profil" (AGENTS.md 5.3) - findet
	// echte öffentliche Profile und Ghost-Accounts (nicht registrierte
	// Veranstalter, die bereits von jemand anderem angelegt wurden).
	type OrganizerSearchResult = {
		userId: string;
		displayName: string | null;
		verified: boolean;
		isGhost: boolean;
	};
	let organizerSearchQuery = $state('');
	let organizerSearchResults = $state<OrganizerSearchResult[]>([]);
	let organizerSearchLoading = $state(false);
	let organizerSelectedLabel = $state('');
	let organizerError = $state('');

	// Rechte-/Verantwortungsbestätigung (Pflicht-Checkbox vor Submit, siehe AGENTS.md 5 -
	// Einreichungsformular). Wird serverseitig ebenfalls geprüft, da das `required`-Attribut
	// clientseitig umgangen werden kann.
	let rightsConfirmed = $state(false);

	$effect(() => {
		const query = organizerSearchQuery.trim();
		if (organizerUserId || query.length < 1) {
			organizerSearchResults = [];
			return;
		}
		const timer = setTimeout(async () => {
			organizerSearchLoading = true;
			try {
				const response = await fetch(
					`/veranstaltung-eintragen/organizer-search?q=${encodeURIComponent(query)}`
				);
				const json = await response.json();
				organizerSearchResults = json.results ?? [];
			} finally {
				organizerSearchLoading = false;
			}
		}, 250);
		return () => clearTimeout(timer);
	});

	function selectOrganizer(result: OrganizerSearchResult) {
		organizerUserId = result.userId;
		organizerSelectedLabel = result.displayName ?? 'Unbenannt';
		organizerSearchResults = [];
		organizerError = '';
	}

	function clearOrganizerSelection() {
		organizerUserId = '';
		organizerSelectedLabel = '';
		organizerSearchQuery = '';
	}

	const bundeslandOptions = $derived(
		data.bundeslaenderByCountry.flatMap((group) =>
			group.bundeslaender.map((bl) => ({
				value: bl.id,
				label: `${bl.name} (${group.country.toUpperCase()})`
			}))
		)
	);
	const kreisOptions = $derived(
		data.bundeslaenderByCountry
			.flatMap((group) => group.bundeslaender)
			.find((bl) => bl.id === bundeslandId)
			?.kreise.map((k) => ({ value: k.id, label: k.name })) ?? []
	);
	const partyArtOptions = $derived(
		data.partyArten.map((art) => ({ value: art.id, label: art.name }))
	);

	const canonical = `${SITE_URL}/veranstaltung-eintragen`;

	const requiredFieldsFilled = $derived(
		title.trim().length >= 3 &&
			!!startDate &&
			!!endDate &&
			!!bundeslandId &&
			!!kreisId &&
			!!partyArtId &&
			addressDescription.trim().length >= 3
	);
	const organizerValid = $derived(
		!data.isLoggedIn ||
			(organizerMode === 'myself'
				? data.isProfilePublic
				: organizerMode === 'profile'
					? !!organizerUserId
					: !!organizerName.trim())
	);
	const canSubmit = $derived(data.isLoggedIn);
	const formValid = $derived(requiredFieldsFilled && organizerValid && rightsConfirmed);
</script>

<svelte:head>
	<title>Veranstaltung kostenlos eintragen | dorfpartys.com</title>
	<meta
		name="description"
		content="Trag dein Schützenfest, deine Zeltfete, Scheunenfete oder dein Dorffest kostenlos ein - in wenigen Minuten online, DACH-weit sichtbar, für immer werbefrei."
	/>
	<meta name="robots" content="index,follow" />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Veranstaltung kostenlos eintragen - dorfpartys.com" />
	<meta
		property="og:description"
		content="Die größte kostenlose Übersicht für Dorfpartys im DACH-Raum - trag deine Veranstaltung in wenigen Minuten ein."
	/>
	<meta property="og:url" content={canonical} />
</svelte:head>

<main class="mx-auto max-w-[90ch]">
	<header>
		<p class="mb-2 text-[0.75rem] font-bold tracking-[0.08em] text-primary uppercase">
			Kostenlos · Werbefrei · In 5 Minuten
		</p>
		<h1 class="leading-[1.05]">
			Trag deine Party ein -<br />
			<span class="bg-primary px-1 text-ink">gefunden von der ganzen Gegend</span>
		</h1>
		<p class="mt-4 max-w-[60ch] text-lg text-muted">
			Egal ob Schützenfest, Zeltfete, Scheunenfete, Stoppelfete oder Dorffest: dorfpartys.com ist
			die größte kostenlose Liste für lokale Feste im DACH-Raum - und die einzige Plattform, die für
			genau diese Suchanfragen optimiert ist. Wer nach Partys in deiner Region sucht, findet dich
			hier.
		</p>
	</header>

	<ul class="my-10 grid gap-4 sm:grid-cols-2">
		<li class="border-t border-border py-4">
			<p class="font-display text-lg font-semibold">Für immer kostenlos</p>
			<p class="mt-1 text-muted">
				Kein Abo, keine Promotion-Gebühr, keine versteckten Kosten - auch nicht später.
			</p>
		</li>
		<li class="border-t border-border py-4">
			<p class="font-display text-lg font-semibold">Mehr Reichweite als Social Media</p>
			<p class="mt-1 text-muted">
				Dein Event bekommt eine eigene, dauerhaft auffindbare Seite statt im Instagram-Feed nach
				drei Tagen zu verschwinden.
			</p>
		</li>
		<li class="border-t border-border py-4">
			<p class="font-display text-lg font-semibold">Für Google & KI-Suche optimiert</p>
			<p class="mt-1 text-muted">
				Jede Region, Party-Art und jeder Monat hat eine eigene Seite - dein Event taucht dort auf,
				wo Menschen danach fragen.
			</p>
		</li>
		<li class="border-t border-border py-4 sm:border-b">
			<p class="font-display text-lg font-semibold">Eigene Veranstalter-Seite</p>
			<p class="mt-1 text-muted">
				Alle deine Veranstaltungen, Profil und Links gebündelt an einem Ort - ideal für Vereine mit
				wiederkehrenden Festen.
			</p>
		</li>
	</ul>

	{#if submitStatus === 'success' || form?.success}
		<p class="mb-6 flex items-center gap-2 border border-primary bg-bg-alt p-4 text-text">
			<span class="text-primary" aria-hidden="true">✓</span>
			Danke! Dein Event wurde zur redaktionellen Prüfung eingereicht und ist in Kürze sichtbar.
		</p>
	{/if}
	{#if form?.error}
		<p class="mb-6 flex items-center gap-2 border border-secondary bg-bg-alt p-4 text-text">
			<span class="text-secondary" aria-hidden="true">✗</span>
			{form.error}
		</p>
	{/if}

	<form method="POST" action="?/submit" onsubmit={handleSubmit}>
		<FormGrid>
			<div class="sm:col-span-full">
				<ImageUpload
					name="photo"
					label="Foto (optional)"
					onUploadComplete={(s3Key) => {
						uploadedPhotoS3Key = s3Key;
					}}
				/>
			</div>

			<div class="sm:col-span-full">
				<TextInput
					label="Titel"
					name="title"
					required
					minlength={3}
					maxlength={140}
					placeholder="z.B. Schützenfest Steinhorst"
					bind:value={title}
					error={form?.fieldErrors?.title?.[0]}
				/>
			</div>

			<div class="sm:col-span-full">
				<label class="field-label" for="description">Beschreibung (optional)</label>
				<textarea
					class="field-control"
					id="description"
					name="description"
					minlength="10"
					maxlength="5000"
					rows="5"
					placeholder="Was erwartet die Gäste? Musik, Festzelt, Programm, Anfahrt..."
					bind:value={description}></textarea>
				<p class="mt-1 text-xs text-muted">
					Freiwillig - achte darauf, keine fremden Werbetexte zu kopieren, diese können
					urheberrechtlich geschützt sein.
				</p>
				{#if form?.fieldErrors?.description}
					<p class="field-error">{form.fieldErrors.description[0]}</p>
				{/if}
			</div>

			<div class="field">
				<label class="field-label" for="startDate">Start *</label>
				<input
					class="field-control"
					id="startDate"
					type="datetime-local"
					name="startDate"
					required
					bind:value={startDate}
				/>
				{#if form?.fieldErrors?.startDate}
					<p class="field-error">{form.fieldErrors.startDate[0]}</p>
				{/if}
			</div>
			<div class="field">
				<label class="field-label" for="endDate">Ende *</label>
				<input
					class="field-control"
					id="endDate"
					type="datetime-local"
					name="endDate"
					required
					bind:value={endDate}
				/>
				{#if form?.fieldErrors?.endDate}
					<p class="field-error">{form.fieldErrors.endDate[0]}</p>
				{/if}
			</div>

			<DropdownSelect
				label="Bundesland"
				name="bundeslandId"
				required
				options={bundeslandOptions}
				bind:value={bundeslandId}
				placeholder="Bitte wählen"
				error={form?.fieldErrors?.bundeslandId?.[0]}
			/>

			<DropdownSelect
				label="Kreis"
				name="kreisId"
				required
				options={kreisOptions}
				bind:value={kreisId}
				placeholder="Bitte wählen"
				disabled={!bundeslandId}
				error={form?.fieldErrors?.kreisId?.[0]}
			/>
			{#if form?.error}<p class="field-error sm:col-span-full">{form.error}</p>{/if}

			<DropdownSelect
				label="Party-Art"
				name="partyArtId"
				required
				options={partyArtOptions}
				bind:value={partyArtId}
				placeholder="Bitte wählen"
				error={form?.fieldErrors?.partyArtId?.[0]}
			/>

			<TextInput
				label="Adresse (Freitext)"
				name="addressDescription"
				required
				minlength={3}
				maxlength={300}
				placeholder="z.B. Dorfplatz, 23845 Steinhorst"
				bind:value={addressDescription}
				error={form?.fieldErrors?.addressDescription?.[0]}
			/>

			<div class="field">
				<label class="field-label" for="customColor">Farbe der Event-Seite</label>
				<input
					class="h-11 w-20 border border-border bg-transparent"
					id="customColor"
					type="color"
					name="customColor"
					value="#ff6b35"
				/>
				{#if form?.fieldErrors?.customColor}
					<p class="field-error">{form.fieldErrors.customColor[0]}</p>
				{/if}
			</div>

			<TextInput
				label="Preis (optional)"
				name="priceInfo"
				maxlength={200}
				placeholder="z.B. 5€ VVK / 8€ AK"
				error={form?.fieldErrors?.priceInfo?.[0]}
			/>

			<div class="field">
				<label class="field-label" for="minAge">Mindestalter (optional)</label>
				<input class="field-control" id="minAge" type="number" name="minAge" min="0" max="99" />
				{#if form?.fieldErrors?.minAge}
					<p class="field-error">{form.fieldErrors.minAge[0]}</p>
				{/if}
			</div>

			<Toggle label="Muttizettel erforderlich" name="allowsMuttizettel" />
			<Toggle label="Open Air" name="isOutdoor" />

			{#if data.isLoggedIn}
				<div class="border-t border-border pt-4 sm:col-span-full">
					<RadioGroup
						legend="Veranstalter"
						name="organizerMode"
						bind:value={organizerMode}
						options={(() => {
							const opts = [];
							if (data.isProfilePublic) {
								opts.push({
									value: 'myself',
									label: 'Ich selbst'
								});
							} else {
								opts.push({
									value: 'myself',
									label: 'Ich selbst',
									description:
										'Profil muss öffentlich sein – aktiviere das in den Profileinstellungen'
								});
							}
							opts.push({
								value: 'profile',
								label: 'Anderes öffentliches Profil'
							});
							opts.push({
								value: 'freetext',
								label: 'Freitext-Name'
							});
							return opts;
						})()}
					/>

					{#if !data.isProfilePublic && organizerMode === 'myself'}
						<p class="mt-3 rounded border border-secondary bg-bg-alt p-3 text-sm text-muted">
							Um dich selbst als Veranstalter eintragen zu können, muss dein Profil öffentlich sein.
							<a href={resolve('/profil')} class="text-primary hover:underline"
								>Aktiviere das jetzt in deinen Profileinstellungen →</a
							>
						</p>
					{/if}

					{#if organizerMode === 'profile'}
						<div class="mt-3">
							{#if organizerSelectedLabel}
								<p class="flex items-center gap-2 text-sm text-text">
									Ausgewählt: <strong>{organizerSelectedLabel}</strong>
									<button
										type="button"
										class="text-primary underline"
										onclick={clearOrganizerSelection}
									>
										Ändern
									</button>
								</p>
							{:else}
								<TextInput
									label="Veranstalter suchen"
									name="organizerProfileSearch"
									placeholder="Name eingeben..."
									bind:value={organizerSearchQuery}
								/>
								{#if organizerSearchLoading}
									<p class="mt-2 text-sm text-muted">Suche…</p>
								{:else if organizerSearchResults.length > 0}
									<ul class="mt-2 divide-y divide-border border border-border">
										{#each organizerSearchResults as result (result.userId)}
											<li>
												<button
													type="button"
													class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-bg-alt"
													onclick={() => selectOrganizer(result)}
												>
													<span>{result.displayName ?? 'Unbenannt'}</span>
													{#if result.verified}
														<VerifiedBadge title="Verifiziert" />
													{/if}
													{#if result.isGhost}
														<span class="text-xs text-muted">(nicht registriert)</span>
													{/if}
												</button>
											</li>
										{/each}
									</ul>
								{:else if organizerSearchQuery.trim().length > 0}
									<p class="mt-2 text-sm text-muted">
										Kein Treffer. Trag den Namen stattdessen unter "Freitext-Name" ein, um einen
										neuen Veranstalter-Eintrag anzulegen.
									</p>
								{/if}
								{#if organizerError}
									<p class="field-error mt-2">{organizerError}</p>
								{/if}
								<p class="mt-2 text-xs text-muted">
									Wählst du ein fremdes, bereits registriertes Profil, muss dessen Inhaber oder ein
									Moderator die Zuordnung erst bestätigen, bevor sie sichtbar wird.
								</p>
							{/if}
						</div>
					{/if}

					{#if organizerMode === 'freetext'}
						<div class="mt-3">
							<TextInput
								label="Veranstalter-Name"
								name="organizerName"
								required={organizerMode === 'freetext'}
								minlength={1}
								maxlength={200}
								placeholder="z.B. Heimatverein Steinhorst"
								bind:value={organizerName}
								error={organizerMode === 'freetext' && !organizerName
									? 'Veranstalter-Name erforderlich'
									: form?.fieldErrors?.organizerName?.[0]}
							/>
						</div>
					{/if}

					{#if organizerMode === 'myself'}
						<input type="hidden" name="organizerUserId" value={data.currentUserId} />
					{:else if organizerMode === 'profile'}
						<input type="hidden" name="organizerUserId" value={organizerUserId} />
					{:else if organizerMode === 'freetext'}
						<input type="hidden" name="organizerName" value={organizerName} />
					{/if}
				</div>
			{/if}
		</FormGrid>

		{#if uploadedPhotoS3Key}
			<input type="hidden" name="photoS3Key" value={uploadedPhotoS3Key} />
		{/if}

		{#if canSubmit}
			<div class="mt-6 border-t border-border pt-4">
				<Toggle
					label="Ich bestätige die Rechte- und Inhaltsangaben *"
					name="rightsConfirmed"
					required
					bind:checked={rightsConfirmed}
				/>
				<p class="mt-2 max-w-[70ch] text-xs text-muted">
					Ich bestätige, dass ich alle erforderlichen Rechte an den hochgeladenen Texten und Bildern
					besitze und die Verantwortung für die Inhalte übernehme. Ich räume dorfpartys.com das
					Recht ein, diese Inhalte zu nutzen, zu vervielfältigen, zu verbreiten und öffentlich
					zugänglich zu machen - auch zu Werbezwecken. Die Angaben sind nach bestem Wissen korrekt,
					ich bin berechtigt, sie zu veröffentlichen, und es handelt sich um eine legale, zulässige
					und öffentliche Veranstaltung. dorfpartys.com behält sich vor, Inhalte zu entfernen, die
					gegen unsere Richtlinien oder Rechte Dritter verstoßen (siehe
					<a class="text-primary hover:underline" href={resolve('/nutzungsbedingungen')}
						>Nutzungsbedingungen</a
					>).
				</p>
				{#if form?.fieldErrors?.rightsConfirmed}
					<p class="field-error mt-1">{form.fieldErrors.rightsConfirmed[0]}</p>
				{/if}
			</div>

			<div class="mt-4">
				<Button type="submit" disabled={submitStatus === 'submitting' || !formValid}>
					{#if submitStatus === 'submitting'}
						<span class="submit-spinner" aria-hidden="true"></span>
						Wird gesendet...
					{:else if submitStatus === 'success'}
						<span aria-hidden="true">✓</span>
						Eingereicht
					{:else if submitStatus === 'error'}
						<span aria-hidden="true">✗</span>
						Erneut versuchen
					{:else}
						Kostenlos eintragen
					{/if}
				</Button>
			</div>
		{:else if data.isLoggedIn}
			<p class="mt-4 text-[0.85rem] text-muted">
				Du kannst Events einreichen, sobald du eingeloggt bist.
			</p>
		{:else}
			<div>
				<Button type="button" href={loginHref}>Einloggen zum Eintragen</Button>
				<p class="mt-2 text-[0.85rem] text-muted">
					Kostenloser Login per Discord, Google oder Facebook - kein zusätzliches Passwort.
				</p>
			</div>
		{/if}
	</form>
</main>

<style>
	.submit-spinner {
		width: 14px;
		height: 14px;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
