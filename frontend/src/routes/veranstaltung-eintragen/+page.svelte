<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import '$lib/components/form-field.css';
	import {
		Button,
		DropdownSelect,
		FeedbackBanner,
		FormGrid,
		Modal,
		PhotoUpload,
		RadioGroup,
		TextInput,
		Toggle,
		VerifiedBadge
	} from '$lib/components/index.js';
	import { callAction } from '$lib/utils/form-action.js';
	import { MAX_EVENT_LINKS, SITE_URL } from '@dorfpartys/shared';
	import type { ActionData, PageData } from './$types.js';

	let { data, form: initialForm }: { data: PageData; form: ActionData } = $props();

	// Bewusster Einmal-Snapshot, keine `$derived`: `form` wird danach lokal
	// verwaltet (handleSubmit setzt es direkt nach dem fetch-basierten
	// Submit, siehe unten) und beim Zurücksetzen (resetForm) nicht mehr über
	// den Prop bezogen.
	// svelte-ignore state_referenced_locally
	let form = $state(initialForm);
	let submitStatus = $state<'idle' | 'submitting' | 'success' | 'error'>('idle');
	// Großes, kaum zu übersehendes Feedback-Banner nach dem Absenden (Teil E) -
	// separat von den bestehenden kleinen Inline-Meldungen weiter unten, die
	// zusätzlich bestehen bleiben (u.a. wegen des No-JS-Fallbacks: ohne
	// JavaScript läuft die Action als normaler Form-POST, das Banner unten wird
	// dann per SSR aus `form` gerendert). `feedbackDismissed` wird bei jedem
	// neuen Absenden zurückgesetzt, damit ein zuvor weggeklicktes Banner beim
	// nächsten Versuch wieder erscheint.
	let feedbackDismissed = $state(false);

	// Lokale, überschreibbare Kopie von `data.isProfilePublic` - wird sofort
	// nach erfolgreichem "Profil öffentlich machen"-Modal (siehe unten) auf
	// `true` gesetzt, ohne die Seite neu zu laden/zu invalidieren. Ein
	// `invalidate()`/`goto()` würde zwar `data` aktualisieren, aber auch einen
	// Re-Fetch der Load-Funktion auslösen und ist hier bewusst vermieden, damit
	// keinerlei Risiko besteht, bereits eingegebene Formularfelder (Titel,
	// Beschreibung, Datum, ...) zu verlieren - diese hängen alle an eigenem
	// $state, nicht an `data`, aber ein Re-Render/Remount soll trotzdem
	// ausgeschlossen sein.
	// svelte-ignore state_referenced_locally
	let isProfilePublic = $state(data.isProfilePublic);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (organizerMode === 'myself' && !isProfilePublic) {
			return;
		}
		if (organizerMode === 'profile' && !organizerUserId) {
			organizerError = 'Bitte wähle ein Profil aus der Ergebnisliste aus.';
			return;
		}
		organizerError = '';

		const formEl = event.currentTarget as HTMLFormElement;
		submitStatus = 'submitting';
		feedbackDismissed = false;

		const outcome = await callAction(formEl.action, new FormData(formEl));

		if (outcome.ok) {
			submitStatus = 'success';
			form = (outcome.data ?? { success: true }) as ActionData;
			// Neuanlage (nicht Bearbeiten): Formular für die nächste Einreichung
			// leeren, statt die zuletzt eingetragene Veranstaltung stehen zu
			// lassen (Produktvorgabe - siehe resetForm() weiter unten).
			if (!isEditing) resetForm();
		} else {
			submitStatus = 'error';
			form = (outcome.data ?? { error: outcome.error }) as ActionData;
		}
	}

	// `#formular` landet nach dem Login (und ggf. Onboarding, siehe /willkommen)
	// direkt wieder am Formular statt am Seitenanfang (Teil D der
	// Submission-Flow-Vereinfachung) - der Fragment-Teil wird vom
	// `redirect()`-Aufruf in auth/callback/+server.ts unverändert durchgereicht.
	const loginHref = $derived(
		resolve(
			`/auth/login?redirectTo=${encodeURIComponent(page.url.pathname + page.url.search + '#formular')}`
		)
	);

	// Bearbeiten-Modus: /veranstaltung-eintragen?id=... (Link aus
	// /meine-veranstaltungen). `data.editingEvent` ist bereits eigentums-geprüft
	// im Load (+page.server.ts). Alle Felder unten werden daraus vorbefüllt -
	// derselbe Formular-Markup wie beim Neuanlegen, siehe TODO.md "Das
	// Bearbeiten von Veranstaltungen ist noch nicht möglich...".
	// Bewusst EIN Snapshot bei Mount, kein `$derived`: sämtliche Formularfelder
	// weiter unten (title, description, organizerMode, ...) werden ebenfalls
	// nur einmalig aus `editingEvent` vorbefüllt und danach rein lokal
	// bearbeitet - ein `$derived` hier allein würde diese Konsistenz brechen
	// (Kopfzeile/Hidden-Inputs würden bei einer `data`-Änderung plötzlich ein
	// anderes Event zeigen als die editierbaren Felder). Ein Wechsel des
	// bearbeiteten Events erfordert daher wie vorgesehen einen vollen Reload
	// dieser Seite (neuer `?id=`-Link von /meine-veranstaltungen aus).
	// svelte-ignore state_referenced_locally
	const editingEvent = data.editingEvent;
	const isEditing = !!editingEvent;

	// Wandelt ein ISO-Datum in den lokalen `datetime-local`-Wert um (Gegenstück
	// zu toIsoStringOrNull im Load) - `.toISOString()` allein wäre UTC und
	// würde beim erneuten Öffnen des Formulars eine falsche Uhrzeit anzeigen.
	function toDatetimeLocalValue(iso: string): string {
		const date = new Date(iso);
		const offsetMs = date.getTimezoneOffset() * 60_000;
		return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
	}

	let title = $state(editingEvent?.title ?? '');
	let description = $state(editingEvent?.description ?? '');
	// startDate/endDate sind optional (AGENTS.md 5, "Quantität über Qualität") -
	// beim Bearbeiten eines Events ohne Termin bleibt das Feld leer.
	let startDate = $state(
		editingEvent?.startDate ? toDatetimeLocalValue(editingEvent.startDate) : ''
	);
	let endDate = $state(editingEvent?.endDate ? toDatetimeLocalValue(editingEvent.endDate) : '');
	let bundeslandId = $state(editingEvent?.bundeslandId ?? '');
	let kreisId = $state(editingEvent?.kreisId ?? '');
	let partyArtId = $state(editingEvent?.partyArtId ?? '');
	let addressDescription = $state(editingEvent?.addressDescription ?? '');
	let uploadedPhotoS3Key = $state<string | null>(null);
	// Wird von PhotoUpload gemeldet, solange ein ausgewähltes Foto noch
	// client-seitig optimiert/hochgeladen wird - sperrt "Absenden" (siehe
	// Button unten), damit ein Klick nicht mitten im Upload passiert. Der
	// rohe Original-File verlässt PhotoUpload.svelte ohnehin nie (kein `name`-
	// Attribut auf dem File-Input), aber ohne diese Sperre würde ein zu
	// frühes Absenden weiterhin einfach zu einem Event OHNE das gewählte Foto
	// führen (photoS3Key steht ja erst nach Abschluss des Uploads fest).
	let photoUploadBusy = $state(false);
	// Erzwingt einen Remount von <PhotoUpload> beim Zurücksetzen des Formulars
	// (resetForm() unten) - einfachster Weg, dessen internen Vorschau-/
	// Upload-State (previewUrl, uploadedS3Key) zu leeren, ohne eine eigene
	// imperative Reset-Schnittstelle am Component zu brauchen.
	let photoResetKey = $state(0);
	// Bestehendes Foto beim Bearbeiten (max. 1, siehe MAX_EVENT_PHOTOS) - wird
	// serverseitig automatisch beibehalten, solange weder ein neues Foto
	// hochgeladen noch "Foto entfernen" angehakt wird (+page.server.ts).
	const existingPhoto = editingEvent?.photos?.[0] ?? null;
	let removeExistingPhoto = $state(false);

	// Links (TikTok/Instagram/Facebook/Website, max. MAX_EVENT_LINKS - AGENTS.md
	// Abschnitt 2 & 5). Reihenfolge der Liste = position beim Speichern. Der
	// Linktyp/Icon wird nicht hier gewählt, sondern serverseitig + auf der
	// Event-Seite rein aus der URL-Domain hergeleitet (siehe
	// @dorfpartys/shared detectEventLinkType), daher hier nur URL + optionales Label.
	type LinkDraft = { url: string; label: string };
	let links = $state<LinkDraft[]>(
		editingEvent?.links?.map((l) => ({ url: l.url, label: l.label })) ?? []
	);

	function addLink() {
		if (links.length >= MAX_EVENT_LINKS) return;
		links.push({ url: '', label: '' });
	}

	function removeLink(index: number) {
		links.splice(index, 1);
	}

	// Weitere optionale Felder - beim Bearbeiten aus editingEvent vorbefüllt.
	let priceInfo = $state(editingEvent?.priceInfo ?? '');
	// Svelte koppelt `bind:value` auf einem `type="number"`-Input automatisch als
	// Number (nicht String) - siehe <input type="number" bind:value={minAge}> unten.
	let minAge = $state<number | undefined>(editingEvent?.minAge ?? undefined);
	let allowsMuttizettel = $state(editingEvent?.allowsMuttizettel ?? false);
	let isOutdoor = $state(editingEvent?.isOutdoor ?? false);
	let customColor = $state(editingEvent?.customColor ?? '#ff6b35');

	// Organizer selection state - beim Bearbeiten aus editingEvent hergeleitet:
	// "myself" wenn der aktuelle Nutzer schon der hinterlegte Veranstalter ist,
	// sonst "profile" (fremdes/Ghost-Profil, Anzeigename kommt vom Backend via
	// `organizerDisplayName`, siehe events.getForEdit) oder "freetext".
	// Bewusster Einmal-Snapshot (wie editingEvent oben): `organizerMode` ist
	// danach frei per RadioGroup umschaltbar, `data.currentUserId` ändert sich
	// ohnehin nicht während die Seite gemountet ist (Identität des
	// eingeloggten Nutzers wechselt nicht zur Laufzeit).
	// svelte-ignore state_referenced_locally
	let organizerMode = $state<'myself' | 'profile' | 'freetext'>(
		editingEvent
			? editingEvent.organizerUserId === data.currentUserId
				? 'myself'
				: editingEvent.organizerUserId
					? 'profile'
					: 'freetext'
			: 'myself'
	);
	// svelte-ignore state_referenced_locally
	let organizerUserId = $state(
		editingEvent && editingEvent.organizerUserId !== data.currentUserId
			? (editingEvent.organizerUserId ?? '')
			: ''
	);
	let organizerName = $state(editingEvent?.organizerName ?? '');

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
	// Bewusster Einmal-Snapshot: wird danach ausschließlich manuell gepflegt
	// über selectOrganizer()/clearOrganizerSelection() unten, nicht automatisch
	// aus `organizerMode` neu abgeleitet (sonst würde ein Zurückschalten auf
	// "profile" den zuvor gewählten Anzeigenamen verlieren).
	// svelte-ignore state_referenced_locally
	let organizerSelectedLabel = $state(
		organizerMode === 'profile' ? (editingEvent?.organizerDisplayName ?? 'Unbenannt') : ''
	);
	let organizerError = $state('');

	// "Profil öffentlich machen"-Modal (Produktvorgabe: Wahl von "Ich selbst"
	// als Veranstalter soll bei fehlendem öffentlichen Profil direkt hier lösbar
	// sein, statt nur auf /profil zu verlinken und den ausgefüllten
	// Formular-Fortschritt zu riskieren). Ruft die Action `?/makeProfilePublic`
	// (+page.server.ts) per fetch auf - analog zu `handleSubmit`/PhotoUpload
	// oben, KEIN normaler Form-POST, damit die Seite nicht neu geladen wird.
	let showPublicProfileModal = $state(false);
	let publicProfileSubmitting = $state(false);
	let publicProfileError = $state('');

	function openPublicProfileModal() {
		publicProfileError = '';
		showPublicProfileModal = true;
	}

	function closePublicProfileModal() {
		if (publicProfileSubmitting) return;
		showPublicProfileModal = false;
	}

	async function confirmMakeProfilePublic() {
		publicProfileSubmitting = true;
		publicProfileError = '';

		const outcome = await callAction<{ publicProfileError?: string }>(
			`${page.url.pathname}?/makeProfilePublic`,
			new FormData()
		);

		if (outcome.ok) {
			isProfilePublic = true;
			showPublicProfileModal = false;
		} else {
			publicProfileError =
				outcome.data?.publicProfileError ??
				outcome.error ??
				'Profil konnte nicht öffentlich gestellt werden.';
		}

		publicProfileSubmitting = false;
	}

	// Rechte-/Verantwortungsbestätigung (Pflicht-Checkbox vor Submit, siehe AGENTS.md 5 -
	// Einreichungsformular). Beim Bearbeiten bewusst nicht vorausgefüllt/übersprungen -
	// wird bei jeder Einreichung erneut bestätigt, siehe Kommentar bei der Checkbox unten.
	let rightsConfirmed = $state(false);

	// Nach erfolgreicher Neuanlage (nicht Bearbeiten, siehe handleSubmit oben)
	// wird das Formular komplett geleert, damit dieselbe Seite direkt für die
	// nächste Einreichung genutzt werden kann, ohne die zuvor eingetragene
	// Veranstaltung stehen zu lassen.
	function resetForm() {
		title = '';
		description = '';
		startDate = '';
		endDate = '';
		bundeslandId = '';
		kreisId = '';
		partyArtId = '';
		addressDescription = '';
		uploadedPhotoS3Key = null;
		removeExistingPhoto = false;
		photoResetKey += 1;
		links = [];
		priceInfo = '';
		minAge = undefined;
		allowsMuttizettel = false;
		isOutdoor = false;
		customColor = '#ff6b35';
		organizerMode = 'myself';
		organizerUserId = '';
		organizerName = '';
		organizerSearchQuery = '';
		organizerSearchResults = [];
		organizerSelectedLabel = '';
		organizerError = '';
		rightsConfirmed = false;
	}

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

	// Nur Titel, Bundesland, Kreis und Art sind Pflicht (AGENTS.md 5, "Quantität
	// über Qualität") - Datum/Uhrzeit und Adresse sind bewusst NICHT Teil dieser
	// Prüfung, siehe die (optional)-Beschriftung bei den jeweiligen Feldern unten.
	const requiredFieldsFilled = $derived(
		title.trim().length >= 3 && !!bundeslandId && !!kreisId && !!partyArtId
	);
	const organizerValid = $derived(
		!data.isLoggedIn ||
			(organizerMode === 'myself'
				? isProfilePublic
				: organizerMode === 'profile'
					? !!organizerUserId
					: !!organizerName.trim())
	);
	const canSubmit = $derived(data.isLoggedIn);
	const formValid = $derived(requiredFieldsFilled && organizerValid && rightsConfirmed);

	// Großes Feedback-Banner (Teil E): erfolgreiche Einreichung ODER
	// Validierungs-/Server-Fehler sollen unübersehbar sein, nicht nur die
	// kleine Inline-Meldung. `null` = kein Banner sichtbar.
	const feedbackKind = $derived.by((): 'success' | 'error' | null => {
		if (feedbackDismissed) return null;
		if (submitStatus === 'success' || form?.success) return 'success';
		if (submitStatus === 'error' || form?.error) return 'error';
		return null;
	});
	const feedbackMessage = $derived(
		feedbackKind === 'success'
			? isEditing
				? 'Deine Änderungen wurden gespeichert.'
				: 'Danke! Dein Event wurde zur redaktionellen Prüfung eingereicht und ist in Kürze sichtbar.'
			: (form?.error ??
					'Bitte überprüfe deine Eingaben - Details stehen bei den betroffenen Feldern.')
	);

	function dismissFeedback() {
		feedbackDismissed = true;
	}

	// Erfolg verschwindet nach ein paar Sekunden von selbst, ein Fehler bleibt
	// stehen, bis die Person ihn aktiv schließt - sie muss die weiter unten
	// verlinkten Feldfehler erst noch beheben können (Teil E.1).
	$effect(() => {
		if (feedbackKind !== 'success') return;
		const timer = setTimeout(() => {
			feedbackDismissed = true;
		}, 5000);
		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<title
		>{isEditing ? 'Veranstaltung bearbeiten' : 'Veranstaltung kostenlos eintragen'} | dorfpartys.com</title
	>
	<meta
		name="description"
		content="Trag dein Schützenfest, deine Zeltfete, Scheunenfete oder dein Dorffest kostenlos ein - in wenigen Minuten online, DACH-weit sichtbar, für immer werbefrei."
	/>
	{#if isEditing}
		<!-- Bearbeiten einer konkreten, eigenen Veranstaltung ist personenbezogen
		     (analog /profil, /partyliste, AGENTS.md 5a) - kein SEO-Wert, keine Indexierung. -->
		<meta name="robots" content="noindex,nofollow" />
	{:else}
		<meta name="robots" content="index,follow" />
		<link rel="canonical" href={canonical} />
	{/if}
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Veranstaltung kostenlos eintragen - dorfpartys.com" />
	<meta
		property="og:description"
		content="Die größte kostenlose Übersicht für Dorfpartys im DACH-Raum - trag deine Veranstaltung in wenigen Minuten ein."
	/>
	<meta property="og:url" content={canonical} />
</svelte:head>

{#if feedbackKind}
	<FeedbackBanner kind={feedbackKind} message={feedbackMessage} onDismiss={dismissFeedback} />
{/if}

<main class="mx-auto max-w-[90ch]">
	{#if isEditing}
		<header>
			<p class="mb-2 text-[0.75rem] font-bold tracking-[0.08em] text-primary uppercase">
				Veranstaltung bearbeiten
			</p>
			<h1 class="leading-[1.05]">
				{editingEvent?.title}
			</h1>
			<p class="mt-4 max-w-[60ch] text-lg text-muted">
				Ändere die Angaben deiner Veranstaltung. War sie bereits freigeschaltet, wird sie durch das
				Speichern erneut zur redaktionellen Prüfung eingereicht.
			</p>
		</header>
	{:else}
		<header>
			<p class="mb-2 text-[0.75rem] font-bold tracking-[0.08em] text-primary uppercase">
				Kostenlos · Werbefrei · Dauert nur eine Minute
			</p>
			<h1 class="leading-[1.05]">
				Trag deine Party ein -<br />
				<span class="bg-primary px-1 text-ink">gefunden von der ganzen Gegend</span>
			</h1>
			<p class="mt-4 max-w-[60ch] text-lg text-muted">
				Egal ob Schützenfest, Zeltfete, Scheunenfete, Stoppelfete oder Dorffest: dorfpartys.com ist
				die größte kostenlose Liste für lokale Feste im DACH-Raum - und die einzige Plattform, die
				für genau diese Suchanfragen optimiert ist. Wer nach Partys in deiner Region sucht, findet
				dich hier.
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
					Alle deine Veranstaltungen, Profil und Links gebündelt an einem Ort - ideal für Vereine
					mit wiederkehrenden Festen.
				</p>
			</li>
		</ul>
	{/if}

	{#if !data.isLoggedIn}
		<!--
			Teil D: von Anfang an unmissverständlich klar - nicht nur eine kleine
			Notiz oder ein deaktiviertes Formular. Das Formular selbst bleibt
			trotzdem sichtbar/crawlbar darunter (SEO-Landingpage, siehe Kommentar im
			Load in +page.server.ts), nur das Absenden ist gesperrt.
		-->
		<div
			class="mb-10 border-2 border-primary bg-bg-alt p-6 sm:p-8"
			role="region"
			aria-label="Login erforderlich"
		>
			<p class="mb-2 text-[0.75rem] font-bold tracking-[0.08em] text-primary uppercase">
				Login erforderlich
			</p>
			<h2 class="mt-0 mb-2 text-xl leading-tight sm:text-2xl">
				Melde dich an, um deine Veranstaltung einzutragen
			</h2>
			<p class="mb-5 max-w-[60ch] text-muted">
				Das Ausfüllen kostet dich nichts und geht ohne neues Passwort - per Discord, Google oder
				Facebook. Du kannst dir das Formular unten schon vorher ansehen.
			</p>
			<Button href={loginHref}>Jetzt einloggen</Button>
		</div>
	{/if}

	{#if submitStatus === 'success' || form?.success}
		<p class="mb-6 flex items-center gap-2 border border-primary bg-bg-alt p-4 text-text">
			<span class="text-primary" aria-hidden="true">✓</span>
			{isEditing
				? 'Deine Änderungen wurden gespeichert.'
				: 'Danke! Dein Event wurde zur redaktionellen Prüfung eingereicht und ist in Kürze sichtbar.'}
		</p>
	{/if}
	{#if form?.error}
		<p class="mb-6 flex items-center gap-2 border border-secondary bg-bg-alt p-4 text-text">
			<span class="text-secondary" aria-hidden="true">✗</span>
			{form.error}
		</p>
	{/if}

	<form id="formular" method="POST" action="?/submit" onsubmit={handleSubmit}>
		<FormGrid>
			{#if isEditing}
				<input type="hidden" name="id" value={editingEvent?.id} />
				<input type="hidden" name="originalStatus" value={editingEvent?.status} />
			{/if}

			{#if existingPhoto && !removeExistingPhoto && !uploadedPhotoS3Key}
				<div class="sm:col-span-full">
					<span class="field-label">Aktuelles Foto</span>
					<div class="mt-2 max-w-xs">
						<img
							src={existingPhoto.url}
							alt="Aktuelles Foto der Veranstaltung"
							class="h-auto w-full rounded border border-border object-cover"
						/>
					</div>
					<label class="mt-2 flex items-center gap-2 text-sm text-muted">
						<input type="checkbox" name="removeExistingPhoto" bind:checked={removeExistingPhoto} />
						Foto entfernen
					</label>
					<p class="mt-1 text-xs text-muted">
						Um das Foto zu ersetzen, lade unten einfach ein neues hoch - das alte wird dann
						automatisch ersetzt.
					</p>
				</div>
			{/if}

			<div class="sm:col-span-full">
				{#key photoResetKey}
					<PhotoUpload
						name="photo"
						label={existingPhoto ? 'Foto ersetzen (optional)' : 'Foto (optional)'}
						action="uploadPhoto"
						shape="rect"
						extraFields={() => ({ eventId: crypto.randomUUID() })}
						onUploadComplete={(s3Key) => {
							uploadedPhotoS3Key = s3Key;
							removeExistingPhoto = false;
						}}
						onBusyChange={(busy) => (photoUploadBusy = busy)}
						onDiscard={async (s3Key) => {
							const formData = new FormData();
							formData.append('s3Key', s3Key);
							await callAction(`${page.url.pathname}?/discardPhoto`, formData);
						}}
						onCleared={() => {
							uploadedPhotoS3Key = null;
						}}
					/>
				{/key}
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
				<label class="field-label" for="startDate">Start (optional)</label>
				<input
					class="field-control"
					id="startDate"
					type="datetime-local"
					name="startDate"
					bind:value={startDate}
				/>
				<p class="mt-1 text-xs text-muted">
					Termin steht noch nicht fest? Einfach leer lassen und später ergänzen.
				</p>
				{#if form?.fieldErrors?.startDate}
					<p class="field-error">{form.fieldErrors.startDate[0]}</p>
				{/if}
			</div>
			<div class="field">
				<label class="field-label" for="endDate">Ende (optional)</label>
				<input
					class="field-control"
					id="endDate"
					type="datetime-local"
					name="endDate"
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
				label="Adresse (Freitext, optional)"
				name="addressDescription"
				minlength={3}
				maxlength={300}
				placeholder="z.B. Dorfplatz, 23845 Steinhorst"
				bind:value={addressDescription}
				error={form?.fieldErrors?.addressDescription?.[0]}
			/>

			<!--
				Teil C.1: Farbe/Preis/Mindestalter/Muttizettel/Open-Air sind rein
				"Qualitäts"-Angaben ohne Einfluss auf Auffindbarkeit - hinter einem
				standardmäßig eingeklappten <details> versteckt, damit das Formular auf
				den ersten Blick kürzer und weniger einschüchternd wirkt (Produktvorgabe
				"Quantität über Qualität"). Organizer-Auswahl, Fotos und Links bleiben
				bewusst außerhalb, die waren nicht Teil dieser Vorgabe.
			-->
			<details class="options-details sm:col-span-full">
				<summary class="options-summary">Weitere Optionen (optional)</summary>
				<div class="mt-4">
					<FormGrid>
						<div class="field">
							<label class="field-label" for="customColor">Farbe der Event-Seite</label>
							<input
								class="h-11 w-20 border border-border bg-transparent"
								id="customColor"
								type="color"
								name="customColor"
								bind:value={customColor}
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
							bind:value={priceInfo}
							error={form?.fieldErrors?.priceInfo?.[0]}
						/>

						<div class="field">
							<label class="field-label" for="minAge">Mindestalter (optional)</label>
							<input
								class="field-control"
								id="minAge"
								type="number"
								name="minAge"
								min="0"
								max="99"
								bind:value={minAge}
							/>
							{#if form?.fieldErrors?.minAge}
								<p class="field-error">{form.fieldErrors.minAge[0]}</p>
							{/if}
						</div>

						<Toggle
							label="Muttizettel erforderlich"
							name="allowsMuttizettel"
							bind:checked={allowsMuttizettel}
						/>
						<Toggle label="Open Air" name="isOutdoor" bind:checked={isOutdoor} />
					</FormGrid>
				</div>
			</details>

			<div class="border-t border-border pt-4 sm:col-span-full">
				<h2 class="field-label mb-2">Links (optional)</h2>
				<p class="mb-3 text-xs text-muted">
					TikTok, Instagram, Facebook oder Website - max. {MAX_EVENT_LINKS} Links, werden in dieser Reihenfolge
					auf der Event-Seite angezeigt.
				</p>
				{#each links as link, index (index)}
					<div class="mb-3 flex flex-col gap-2 border border-border p-3 sm:flex-row sm:items-start">
						<div class="flex-1">
							<TextInput
								label="URL"
								name="linkUrl"
								type="url"
								placeholder="https://www.instagram.com/dein-account"
								bind:value={link.url}
							/>
						</div>
						<div class="flex-1">
							<TextInput
								label="Label (optional)"
								name="linkLabel"
								maxlength={60}
								placeholder="z.B. Instagram"
								bind:value={link.label}
							/>
						</div>
						<button
							type="button"
							class="min-h-11 shrink-0 border border-border bg-transparent px-4 font-body text-[0.85rem] font-semibold text-text hover:border-primary hover:text-primary sm:mt-6"
							onclick={() => removeLink(index)}
						>
							Entfernen
						</button>
					</div>
				{/each}
				{#if links.length < MAX_EVENT_LINKS}
					<button
						type="button"
						class="min-h-11 border border-border bg-transparent px-4 font-body text-[0.85rem] font-semibold text-text hover:border-primary hover:text-primary"
						onclick={addLink}
					>
						+ Link hinzufügen
					</button>
				{/if}
				{#if form?.fieldErrors?.links}
					<p class="field-error mt-2">{form.fieldErrors.links[0]}</p>
				{/if}
			</div>

			{#if data.isLoggedIn}
				<div class="border-t border-border pt-4 sm:col-span-full">
					<RadioGroup
						legend="Veranstalter"
						name="organizerMode"
						bind:value={organizerMode}
						options={(() => {
							const opts = [];
							if (isProfilePublic) {
								opts.push({
									value: 'myself',
									label: 'Ich selbst'
								});
							} else {
								opts.push({
									value: 'myself',
									label: 'Ich selbst',
									description: 'Profil muss öffentlich sein – das kannst du direkt hier erledigen'
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

					{#if !isProfilePublic && organizerMode === 'myself'}
						<div class="mt-3 rounded border border-secondary bg-bg-alt p-3 text-sm text-muted">
							<p class="mb-3">
								Um dich selbst als Veranstalter eintragen zu können, muss dein Profil öffentlich
								sein.
							</p>
							<Button type="button" variant="secondary" onclick={openPublicProfileModal}>
								Profil jetzt öffentlich machen
							</Button>
							<p class="mt-2 text-xs">
								Oder
								<a
									href={resolve('/profil')}
									target="_blank"
									rel="noopener"
									class="text-primary hover:underline">alle Profildetails bearbeiten →</a
								>
							</p>
						</div>
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
				<p class="mt-2 text-xs text-muted">
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
				<Button
					type="submit"
					disabled={submitStatus === 'submitting' || !formValid || photoUploadBusy}
				>
					{#if submitStatus === 'submitting'}
						<span class="submit-spinner" aria-hidden="true"></span>
						Wird gesendet...
					{:else if submitStatus === 'success'}
						<span aria-hidden="true">✓</span>
						{isEditing ? 'Gespeichert' : 'Eingereicht'}
					{:else if submitStatus === 'error'}
						<span aria-hidden="true">✗</span>
						Erneut versuchen
					{:else if isEditing}
						Änderungen speichern
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

<Modal
	open={showPublicProfileModal}
	onClose={closePublicProfileModal}
	labelledBy="public-profile-modal-title"
>
	<h2 id="public-profile-modal-title" class="mt-0 mb-3 text-xl">Profil öffentlich machen?</h2>
	<p class="mb-3 text-sm text-muted">
		Um dich selbst als Veranstalter eintragen zu können, muss dein Profil öffentlich sein. Das
		bedeutet konkret:
	</p>
	<ul class="mb-4 list-disc space-y-1 pl-5 text-sm text-muted">
		<li>
			Dein Anzeigename, Profilbild und deine Bio sind für alle unter deiner Veranstalter-Seite (<code
				>/veranstalter/…</code
			>) sichtbar.
		</li>
		<li>
			Du wirst als Veranstalter auf diesem und künftigen Events angezeigt, die du unter deinem
			eigenen Namen einträgst.
		</li>
	</ul>
	{#if publicProfileError}
		<p class="field-error mb-3">{publicProfileError}</p>
	{/if}
	<div class="flex flex-wrap gap-3">
		<Button type="button" onclick={confirmMakeProfilePublic} disabled={publicProfileSubmitting}>
			{#if publicProfileSubmitting}
				<span class="submit-spinner" aria-hidden="true"></span>
				Wird gespeichert...
			{:else}
				Ja, Profil öffentlich machen
			{/if}
		</Button>
		<Button
			type="button"
			variant="ghost"
			onclick={closePublicProfileModal}
			disabled={publicProfileSubmitting}
		>
			Abbrechen
		</Button>
	</div>
</Modal>

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

	/* Teil C.1: "Weitere Optionen" - eingeklappt weniger einschüchternd als das
	   volle Formular auf einen Schlag. */
	.options-details {
		border: 1px solid var(--color-border);
		padding: 14px 16px;
	}

	.options-summary {
		cursor: pointer;
		font-family: 'Inter', system-ui, sans-serif;
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--color-text);
		list-style: none;
	}

	.options-summary::-webkit-details-marker {
		display: none;
	}

	.options-summary::before {
		content: '+ ';
		color: var(--color-primary);
	}

	.options-details[open] .options-summary::before {
		content: '– ';
	}
</style>
