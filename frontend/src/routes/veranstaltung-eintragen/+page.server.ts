import {
	COUNTRIES,
	defaultEventLinkLabel,
	submitEventInputSchema,
	updateEventInputSchema,
	type SubmitEventInput,
	type UpdateEventInput
} from '@dorfpartys/shared';
import { error, fail, redirect } from '@sveltejs/kit';
import { TRPCClientError } from '@trpc/client';
import type { Actions, PageServerLoad } from './$types.js';

// Wandelt einen datetime-local-Wert sicher in ein ISO-Datum um (oder `null`,
// wenn das Feld leer gelassen wurde - start_date/end_date sind optional,
// AGENTS.md 5 "Quantität über Qualität": Titel, Bundesland, Kreis und Art
// reichen zum Einreichen). `new Date(...).toISOString()` wirft bei einem
// ungültigen Datum (z.B. wenn die clientseitige HTML5-Validierung umgangen
// wurde) eine RangeError, die sonst unbehandelt durch die Action durchschlägt
// und beim Nutzer als generischer 500-Fehler statt einer verständlichen
// Validierungsmeldung landet - in dem Fall wird `null` zurückgegeben und die
// Zod-Validierung (submitEventInputSchema, ein leeres Feld ist gültig) greift
// nicht mehr dafür; ein tatsächlich ungültiger, nicht-leerer Wert würde im
// Browser durch das `type="datetime-local"`-Input selbst schon verhindert.
// `null` statt `undefined`, damit ein beim Bearbeiten bereits gesetztes Datum
// durch Leeren des Feldes auch wieder explizit entfernt werden kann (die
// Zod-Schemas erwarten hier bewusst einen Pflicht-Key mit nullable Value,
// nicht einen optionalen Key - siehe shared/src/schemas/event.ts).
function toIsoStringOrNull(raw: FormDataEntryValue | null): string | null {
	if (!raw) return null;
	const date = new Date(String(raw));
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Baut das `links`-Array aus den wiederholten linkUrl/linkLabel-Feldern (siehe
// +page.svelte - jede Link-Zeile trägt denselben `name`, FormData sammelt sie
// per getAll() in DOM-Reihenfolge, die zugleich die spätere `position` ist).
// Zeilen ohne URL werden verworfen; fehlt das Label, wird es serverseitig aus
// dem per Domain erkannten Linktyp hergeleitet (TikTok/Instagram/Facebook/Website).
// `forceExplicit` (true beim Bearbeiten): Links sind normale, sichtbar
// vorausgefüllte Formularfelder (anders als das Foto, das eine gesonderte
// Upload-Aktion braucht) - das Formular soll also 1:1 wiedergeben, was aktuell
// in der UI steht, inkl. "alle Links gelöscht" (leeres Array statt `undefined`,
// das beim Bearbeiten sonst als "nicht anfassen" interpretiert würde, siehe
// `replacePhotosAndLinks` im Backend). Beim Neuanlegen bleibt `undefined`
// korrekt, weil dort "keine Links angegeben" gleichbedeutend mit "keine Links
// speichern" ist.
function buildLinksFromFormData(
	formData: FormData,
	forceExplicit = false
): Array<{ url: string; label: string; position: 1 | 2 | 3 }> | undefined {
	const urls = formData.getAll('linkUrl').map((v) => String(v).trim());
	const labels = formData.getAll('linkLabel').map((v) => String(v).trim());

	const links = urls
		.map((url, i) => ({ url, label: labels[i] ?? '' }))
		.filter((l) => l.url.length > 0)
		.map((l, i) => ({
			url: l.url,
			label: l.label.length > 0 ? l.label : defaultEventLinkLabel(l.url),
			position: (i + 1) as 1 | 2 | 3
		}));

	if (links.length > 0) return links;
	return forceExplicit ? [] : undefined;
}

// Liest Zod-Feldfehler aus einem tRPC-Fehler aus, sofern das Backend sie via
// `errorFormatter` mitliefert (backend/src/trpc/trpc.ts). Nötig, weil
// serverseitige Validierungsfehler auch dann auftreten können, wenn die
// clientseitige Prüfung (siehe safeParse unten) umgangen wurde oder die
// Backend-Validierung strenger ist (z.B. `assertKreisBelongsToBundesland`).
function extractServerFieldErrors(err: unknown): Record<string, string[]> | undefined {
	if (!(err instanceof TRPCClientError)) return undefined;
	const zodError = (err.data as { zodError?: { fieldErrors?: Record<string, string[]> } } | null)
		?.zodError;
	return zodError?.fieldErrors;
}

// Bewusst KEIN requireUser()-Gate im Load: die Seite ist die zentrale SEO-
// Landingpage fürs Eintragen ("Veranstaltung kostenlos eintragen") und muss
// für Suchmaschinen-Crawler ohne Login sichtbar/indexierbar bleiben. Login ist
// erst für den eigentlichen Submit (Formular-Action) nötig, siehe unten.
// Bearbeiten-Modus (?id=...) ist die Ausnahme: die Seite lädt dann fremde
// Nutzerdaten und braucht daher ein Login-Gate, siehe unten.
export const load: PageServerLoad = async ({ locals, url }) => {
	let isLoggedIn = false;
	let isProfilePublic = false;
	let currentUserId = '';
	try {
		const me = await locals.trpc.users.me.query();
		isLoggedIn = true;
		currentUserId = me.id;
		const { profile } = await locals.trpc.users.getProfile.query({ userId: me.id });
		isProfilePublic = profile?.isPublic ?? false;
	} catch {
		// nicht eingeloggt - Formular bleibt sichtbar, aber ohne Submit-Möglichkeit
	}

	// Bearbeiten einer bestehenden Veranstaltung: /veranstaltung-eintragen?id=...
	// (Link aus /meine-veranstaltungen). `events.getForEdit` ist selbst schon
	// eigentums-geprüft (einreichende Person oder aktueller Veranstalter), hier
	// zusätzlich das Login-Gate + saubere 404/403-Antworten statt eines
	// generischen tRPC-Fehlers.
	const editId = url.searchParams.get('id');
	let editingEvent: Awaited<ReturnType<typeof locals.trpc.events.getForEdit.query>> | null = null;
	if (editId) {
		if (!isLoggedIn) {
			redirect(302, `/auth/login?redirectTo=${encodeURIComponent(`${url.pathname}${url.search}`)}`);
		}
		try {
			editingEvent = await locals.trpc.events.getForEdit.query({ id: editId });
		} catch (err) {
			const code =
				err instanceof TRPCClientError ? (err.data as { code?: string } | null)?.code : undefined;
			if (code === 'FORBIDDEN') {
				error(403, 'Du kannst nur eigene Veranstaltungen bearbeiten.');
			}
			error(404, 'Veranstaltung nicht gefunden');
		}
	}

	const partyArten = await locals.trpc.taxonomy.partyArten.query();
	const bundeslaenderByCountry = await Promise.all(
		COUNTRIES.map(async (country) => {
			const bundeslaender = await locals.trpc.taxonomy.bundeslaender.query({ country });
			const withKreise = await Promise.all(
				bundeslaender.map(async (bl) => ({
					...bl,
					kreise: await locals.trpc.taxonomy.kreise.query({ bundeslandId: bl.id })
				}))
			);
			return { country, bundeslaender: withKreise };
		})
	);

	return {
		partyArten,
		bundeslaenderByCountry,
		isLoggedIn,
		isProfilePublic,
		currentUserId,
		editingEvent
	};
};

export const actions: Actions = {
	uploadPhoto: async ({ request, locals, url }) => {
		try {
			await locals.trpc.users.me.query();
		} catch {
			redirect(302, `/auth/login?redirectTo=${encodeURIComponent(url.pathname)}`);
		}

		const formData = await request.formData();
		const eventId = formData.get('eventId') as string;
		const contentType = formData.get('contentType') as string;
		const file = formData.get('file') as File;

		if (!file || file.size === 0) {
			return fail(400, { error: 'Keine Datei ausgewählt' });
		}

		try {
			const buffer = Buffer.from(await file.arrayBuffer());
			const result = await locals.trpc.uploads.uploadEventPhoto.mutate({
				eventId,
				contentType: contentType as 'image/jpeg' | 'image/png',
				buffer
			});
			return { success: true, s3Key: result.s3Key };
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : 'Upload fehlgeschlagen'
			});
		}
	},
	submit: async ({ request, locals, url }) => {
		try {
			await locals.trpc.users.me.query();
		} catch {
			redirect(302, `/auth/login?redirectTo=${encodeURIComponent(url.pathname)}`);
		}

		const formData = await request.formData();

		// Bearbeiten-Modus: das Formular postet weiterhin auf `?/submit`, trägt
		// beim Bearbeiten aber ein verstecktes `id`-Feld (siehe +page.svelte).
		// `originalStatus` kommt ebenfalls versteckt mit, um nach dem Speichern
		// zu entscheiden, ob das Event erneut zur Prüfung eingereicht werden muss
		// (siehe unten) - `events.update` selbst kennt den Ausgangsstatus schon
		// serverseitig, aber nicht "soll jetzt explizit resubmitted werden".
		const editIdRaw = formData.get('id');
		const editId = editIdRaw ? String(editIdRaw) : null;
		const originalStatus = formData.get('originalStatus');
		const removeExistingPhoto = formData.get('removeExistingPhoto') === 'on';

		const startDateRaw = formData.get('startDate');
		const endDateRaw = formData.get('endDate');
		const minAgeRaw = formData.get('minAge');
		const photoS3Key = formData.get('photoS3Key');

		const organizerUserId = formData.get('organizerUserId');
		const organizerName = formData.get('organizerName');
		// Pflicht-Bestätigung (Rechte an Inhalten + Einräumung Nutzungsrecht + Richtigkeit der
		// Angaben, siehe AGENTS.md 5 / frontend Checkbox). Checkboxen werden nur als "on"
		// übermittelt, wenn angehakt - clientseitiges `required` kann umgangen werden, daher
		// zusätzlich hier geprüft, nicht Teil von submitEventInputSchema (wird nicht persistiert).
		// Beim Bearbeiten bewusst weiterhin Pflicht (siehe frontend/src/routes/veranstaltung-eintragen/+page.svelte) -
		// eine separate "Checkbox beim Bearbeiten überspringen"-Sonderregel würde die
		// Rechte-Logik an zwei Stellen pflegen.
		const rightsConfirmed = formData.get('rightsConfirmed') === 'on';

		const raw = {
			...(editId ? { id: editId } : {}),
			title: formData.get('title'),
			description: formData.get('description') || undefined,
			startDate: toIsoStringOrNull(startDateRaw),
			endDate: toIsoStringOrNull(endDateRaw),
			bundeslandId: formData.get('bundeslandId'),
			kreisId: formData.get('kreisId'),
			// Optional (AGENTS.md 5) - leeres Feld wird zu `null`, nicht zur
			// leeren Zeichenkette (die an min(3) scheitern würde).
			addressDescription: formData.get('addressDescription') || null,
			partyArtId: formData.get('partyArtId'),
			customColor: formData.get('customColor') || undefined,
			priceInfo: formData.get('priceInfo') || undefined,
			minAge: minAgeRaw ? Number(minAgeRaw) : undefined,
			allowsMuttizettel: formData.get('allowsMuttizettel') === 'on',
			isOutdoor: formData.get('isOutdoor') === 'on',
			...(organizerUserId ? { organizerUserId: String(organizerUserId) } : {}),
			...(organizerName ? { organizerName: String(organizerName) } : {}),
			...(photoS3Key
				? { photos: [{ s3Key: String(photoS3Key), position: 1 as const }] }
				: editId && removeExistingPhoto
					? { photos: [] }
					: {}),
			...(() => {
				// Beim Bearbeiten immer explizit (auch leeres Array = "alle Links
				// entfernt"), beim Neuanlegen wie bisher `undefined` bei 0 Links.
				const links = buildLinksFromFormData(formData, !!editId);
				return links !== undefined ? { links } : {};
			})()
		};

		const parsed = editId
			? updateEventInputSchema.safeParse(raw)
			: submitEventInputSchema.safeParse(raw);
		if (!parsed.success || !rightsConfirmed) {
			const fieldErrors: Record<string, string[]> = parsed.success
				? {}
				: { ...parsed.error.flatten().fieldErrors };
			if (!rightsConfirmed) {
				fieldErrors.rightsConfirmed = [
					'Bitte bestätige die Rechte- und Inhaltsangaben, um fortzufahren.'
				];
			}
			return fail(400, {
				error: 'Bitte überprüfe deine Eingaben.',
				fieldErrors
			});
		}

		try {
			if (editId) {
				await locals.trpc.events.update.mutate(parsed.data as UpdateEventInput);
				// `events.update` setzt ein bereits freigeschaltetes Event serverseitig
				// automatisch auf "in_review" zurück (backend/src/routers/events.ts).
				// Für draft/rejected passiert das nicht automatisch - hier wird das
				// Bearbeiten-Formular genauso wie das Erstellen-Formular behandelt:
				// Speichern = "zur Prüfung einreichen", nicht nur ein stiller Save.
				if (originalStatus === 'draft' || originalStatus === 'rejected') {
					await locals.trpc.events.submitForReview.mutate({ id: editId });
				}
				return { success: true };
			}
			const created = await locals.trpc.events.create.mutate(parsed.data as SubmitEventInput);
			await locals.trpc.events.submitForReview.mutate({ id: created.id });
		} catch (err) {
			// events.create wirft FORBIDDEN, wenn das Profil nicht öffentlich ist
			// (serverseitige Durchsetzung, backend/src/routers/events.ts). Bei
			// serverseitigen Zod-Validierungsfehlern (z.B. Race Condition oder
			// umgangene clientseitige Prüfung) liefert das Backend zusätzlich
			// strukturierte Feldfehler mit (siehe backend/src/trpc/trpc.ts) - die
			// generische tRPC-Message ("Bad Request" o.ä.) ist für Nutzer:innen
			// nicht hilfreich, daher in diesem Fall durch einen Hinweistext ersetzt.
			const fieldErrors = extractServerFieldErrors(err);
			return fail(400, {
				error: fieldErrors
					? 'Bitte überprüfe deine Eingaben.'
					: err instanceof Error
						? err.message
						: 'Einreichung fehlgeschlagen',
				fieldErrors
			});
		}

		return { success: true };
	}
};
