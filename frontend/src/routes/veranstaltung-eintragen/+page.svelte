<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import '$lib/components/form-field.css';
	import { Button, DropdownSelect, FormGrid, TextInput, Toggle } from '$lib/components/index.js';
	import { SITE_URL } from '@dorfpartys/shared';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const loginHref = $derived(
		`${resolve('/auth/login')}?redirectTo=${encodeURIComponent(page.url.pathname)}`
	);
	const profilHref = resolve('/profil');

	let bundeslandId = $state('');
	let kreisId = $state('');

	const bundeslandOptions = $derived(
		data.bundeslaenderByCountry.flatMap((group) =>
			group.bundeslaender.map((bl) => ({ value: bl.id, label: `${bl.name} (${group.country.toUpperCase()})` }))
		)
	);
	const kreisOptions = $derived(
		data.bundeslaenderByCountry
			.flatMap((group) => group.bundeslaender)
			.find((bl) => bl.id === bundeslandId)?.kreise.map((k) => ({ value: k.id, label: k.name })) ?? []
	);
	const partyArtOptions = $derived(data.partyArten.map((art) => ({ value: art.id, label: art.name })));

	const canonical = `${SITE_URL}/veranstaltung-eintragen`;
	const canSubmit = $derived(data.isLoggedIn && data.isProfilePublic);
</script>

<svelte:head>
	<title>Veranstaltung kostenlos eintragen — dorfpartys.com</title>
	<meta
		name="description"
		content="Trag dein Schützenfest, deine Zeltfete, Scheunenfete oder dein Dorffest kostenlos ein — in wenigen Minuten online, DACH-weit sichtbar, für immer werbefrei."
	/>
	<meta name="robots" content="index,follow" />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Veranstaltung kostenlos eintragen — dorfpartys.com" />
	<meta
		property="og:description"
		content="Die größte kostenlose Übersicht für Dorfpartys im DACH-Raum — trag deine Veranstaltung in wenigen Minuten ein."
	/>
	<meta property="og:url" content={canonical} />
</svelte:head>

<article>
	<header class="max-w-[70ch]">
		<p class="mb-2 text-[0.75rem] font-bold tracking-[0.08em] text-primary uppercase">
			Kostenlos · Werbefrei · In 5 Minuten
		</p>
		<h1 class="text-[clamp(2rem,5vw,3rem)] leading-[1.05]">
			Trag deine Party ein —<br />
			<span class="bg-primary px-1 text-ink">gefunden von der ganzen Gegend</span>
		</h1>
		<p class="mt-4 max-w-[60ch] text-lg text-muted">
			Egal ob Schützenfest, Zeltfete, Scheunenfete, Stoppelfete oder Dorffest: dorfpartys.com ist
			die größte kostenlose Liste für lokale Feste im DACH-Raum — und die einzige Plattform, die
			für genau diese Suchanfragen optimiert ist. Wer nach Partys in deiner Region sucht, findet
			dich hier.
		</p>
	</header>

	<ul class="my-10 grid gap-4 sm:grid-cols-2">
		<li class="border-t border-border py-4">
			<p class="font-display text-lg font-semibold">Für immer kostenlos</p>
			<p class="mt-1 text-muted">
				Kein Abo, keine Promotion-Gebühr, keine versteckten Kosten — auch nicht später.
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
				Jede Region, Party-Art und jeder Monat hat eine eigene Seite — dein Event taucht dort auf,
				wo Menschen (und KI-Assistenten) danach fragen.
			</p>
		</li>
		<li class="border-t border-border py-4 sm:border-b">
			<p class="font-display text-lg font-semibold">Eigene Veranstalter-Seite</p>
			<p class="mt-1 text-muted">
				Alle deine Veranstaltungen, Profil und Links gebündelt an einem Ort — ideal für Vereine mit
				wiederkehrenden Festen.
			</p>
		</li>
	</ul>

	{#if form?.success}
		<p class="mb-6 border border-primary bg-bg-alt p-4 text-text">
			Danke! Dein Event wurde zur redaktionellen Prüfung eingereicht und ist in Kürze sichtbar.
		</p>
	{/if}
	{#if form?.error}
		<p class="mb-6 border border-secondary bg-bg-alt p-4 text-text">{form.error}</p>
	{/if}

	{#if data.isLoggedIn && !data.isProfilePublic}
		<p class="mb-6 max-w-[60ch] border border-secondary bg-bg-alt p-4 text-text">
			Dein Profil ist aktuell privat. Um eine Veranstaltung einzutragen, muss dein Profil
			öffentlich sichtbar sein (das macht dich unter deiner Veranstalter-Seite auffindbar).
			<a class="text-primary" href={profilHref}>Jetzt in den Profileinstellungen aktivieren</a>.
		</p>
	{/if}

	<form method="POST" class="grid max-w-[70ch] gap-6">
		<FormGrid>
			<div class="sm:col-span-full">
				<TextInput
					label="Titel"
					name="title"
					required
					minlength={3}
					maxlength={140}
					placeholder="z.B. Schützenfest Steinhorst"
					error={form?.fieldErrors?.title?.[0]}
				/>
			</div>

			<div class="sm:col-span-full">
				<label class="field-label" for="description">Beschreibung *</label>
				<textarea
					class="field-control"
					id="description"
					name="description"
					required
					minlength="10"
					maxlength="5000"
					rows="5"
					placeholder="Was erwartet die Gäste? Musik, Festzelt, Programm, Anfahrt..."
				></textarea>
				{#if form?.fieldErrors?.description}
					<p class="field-error">{form.fieldErrors.description[0]}</p>
				{/if}
			</div>

			<div class="field">
				<label class="field-label" for="startDate">Start *</label>
				<input class="field-control" id="startDate" type="datetime-local" name="startDate" required />
			</div>
			<div class="field">
				<label class="field-label" for="endDate">Ende *</label>
				<input class="field-control" id="endDate" type="datetime-local" name="endDate" required />
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
			/>

			<DropdownSelect
				label="Kreis"
				name="kreisId"
				required
				options={kreisOptions}
				bind:value={kreisId}
				placeholder="Bitte wählen"
				disabled={!bundeslandId}
			/>
			{#if form?.error}<p class="field-error sm:col-span-full">{form.error}</p>{/if}

			<DropdownSelect label="Party-Art" name="partyArtId" required options={partyArtOptions} placeholder="Bitte wählen" />

			<TextInput
				label="Adresse (Freitext)"
				name="addressDescription"
				required
				minlength={3}
				maxlength={300}
				placeholder="z.B. Dorfplatz, 23845 Steinhorst"
			/>

			<div class="field">
				<label class="field-label" for="customColor">Farbe der Event-Seite</label>
				<input class="h-11 w-20 border border-border bg-transparent" id="customColor" type="color" name="customColor" value="#ff6b35" />
			</div>

			<TextInput label="Preis (optional)" name="priceInfo" maxlength={200} placeholder="z.B. 5€ VVK / 8€ AK" />

			<div class="field">
				<label class="field-label" for="minAge">Mindestalter (optional)</label>
				<input class="field-control" id="minAge" type="number" name="minAge" min="0" max="99" />
			</div>

			<Toggle label="Muttizettel erforderlich" name="allowsMuttizettel" />
			<Toggle label="Open Air" name="isOutdoor" />
		</FormGrid>

		{#if canSubmit}
			<Button type="submit">Kostenlos eintragen</Button>
		{:else if data.isLoggedIn}
			<Button type="button" href={profilHref}>Profil öffentlich stellen</Button>
		{:else}
			<div>
				<Button type="button" href={loginHref}>Einloggen zum Eintragen</Button>
				<p class="mt-2 text-[0.85rem] text-muted">
					Kostenloser Login per Discord, Google oder Facebook — kein zusätzliches Passwort.
				</p>
			</div>
		{/if}
	</form>
</article>
