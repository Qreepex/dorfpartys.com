import { COUNTRIES, submitEventInputSchema } from '@dorfpartys/shared';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

// Bewusst KEIN requireUser()-Gate im Load: die Seite ist die zentrale SEO-
// Landingpage fürs Eintragen ("Veranstaltung kostenlos eintragen") und muss
// für Suchmaschinen-Crawler ohne Login sichtbar/indexierbar bleiben. Login ist
// erst für den eigentlichen Submit (Formular-Action) nötig, siehe unten.
export const load: PageServerLoad = async ({ locals }) => {
	let isLoggedIn = false;
	let isProfilePublic = false;
	try {
		const me = await locals.trpc.users.me.query();
		isLoggedIn = true;
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

	return { partyArten, bundeslaenderByCountry, isLoggedIn, isProfilePublic };
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
	default: async ({ request, locals, url }) => {
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

		const raw = {
			title: formData.get('title'),
			description: formData.get('description'),
			startDate: startDateRaw ? new Date(String(startDateRaw)).toISOString() : undefined,
			endDate: endDateRaw ? new Date(String(endDateRaw)).toISOString() : undefined,
			bundeslandId: formData.get('bundeslandId'),
			kreisId: formData.get('kreisId'),
			addressDescription: formData.get('addressDescription'),
			partyArtId: formData.get('partyArtId'),
			customColor: formData.get('customColor') || undefined,
			priceInfo: formData.get('priceInfo') || undefined,
			minAge: minAgeRaw ? Number(minAgeRaw) : undefined,
			allowsMuttizettel: formData.get('allowsMuttizettel') === 'on',
			isOutdoor: formData.get('isOutdoor') === 'on',
			...(photoS3Key ? { photos: [{ s3Key: String(photoS3Key), position: 1 }] } : {})
		};

		const parsed = submitEventInputSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { fieldErrors: parsed.error.flatten().fieldErrors });
		}

		try {
			const created = await locals.trpc.events.create.mutate(parsed.data);
			await locals.trpc.events.submitForReview.mutate({ id: created.id });
		} catch (err) {
			// events.create wirft FORBIDDEN, wenn das Profil nicht öffentlich ist
			// (serverseitige Durchsetzung, backend/src/routers/events.ts).
			return fail(400, {
				error: err instanceof Error ? err.message : 'Einreichung fehlgeschlagen'
			});
		}

		return { success: true };
	}
};
