import { COUNTRIES, submitEventInputSchema } from '@dorfpartys/shared';
import { fail, redirect } from '@sveltejs/kit';
import { TRPCClientError } from '@trpc/client';
import type { Actions, PageServerLoad } from './$types.js';

// Wandelt einen datetime-local-Wert sicher in ein ISO-Datum um. `new
// Date(...).toISOString()` wirft bei einem ungültigen Datum (z.B. wenn die
// clientseitige HTML5-Validierung umgangen wird) eine RangeError, die sonst
// unbehandelt durch die Action durchschlägt und beim Nutzer als generischer
// 500-Fehler statt einer verständlichen Validierungsmeldung landet.
function toIsoStringOrUndefined(raw: FormDataEntryValue | null): string | undefined {
	if (!raw) return undefined;
	const date = new Date(String(raw));
	return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
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
export const load: PageServerLoad = async ({ locals }) => {
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

	return { partyArten, bundeslaenderByCountry, isLoggedIn, isProfilePublic, currentUserId };
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
		const rightsConfirmed = formData.get('rightsConfirmed') === 'on';

		const raw = {
			title: formData.get('title'),
			description: formData.get('description') || undefined,
			startDate: toIsoStringOrUndefined(startDateRaw),
			endDate: toIsoStringOrUndefined(endDateRaw),
			bundeslandId: formData.get('bundeslandId'),
			kreisId: formData.get('kreisId'),
			addressDescription: formData.get('addressDescription'),
			partyArtId: formData.get('partyArtId'),
			customColor: formData.get('customColor') || undefined,
			priceInfo: formData.get('priceInfo') || undefined,
			minAge: minAgeRaw ? Number(minAgeRaw) : undefined,
			allowsMuttizettel: formData.get('allowsMuttizettel') === 'on',
			isOutdoor: formData.get('isOutdoor') === 'on',
			...(organizerUserId ? { organizerUserId: String(organizerUserId) } : {}),
			...(organizerName ? { organizerName: String(organizerName) } : {}),
			...(photoS3Key ? { photos: [{ s3Key: String(photoS3Key), position: 1 }] } : {})
		};

		const parsed = submitEventInputSchema.safeParse(raw);
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
			const created = await locals.trpc.events.create.mutate(parsed.data);
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
