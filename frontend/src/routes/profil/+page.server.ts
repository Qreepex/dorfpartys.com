import { requireUser } from '$lib/server/require-auth.js';
import { updateProfileInputSchema } from '@dorfpartys/shared';
import { fail, redirect } from '@sveltejs/kit';
import { TRPCClientError } from '@trpc/client';
import type { Actions, PageServerLoad } from './$types.js';

// Liest die vom Backend gesetzte Fehlermeldung aus einem tRPC-Fehler aus
// (analog `extractServerFieldErrors` in veranstaltung-eintragen/+page.server.ts),
// statt den Fehler ungetypt als `any` zu behandeln.
function trpcErrorMessage(err: unknown, fallback: string): string {
	if (err instanceof TRPCClientError) return err.message || fallback;
	return fallback;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireUser(locals.trpc, url.pathname);
	const { profile, links } = await locals.trpc.users.getProfile.query({ userId: user.id });
	const pendingNominations = await locals.trpc.users.pendingOrganizerNominations.query();
	return { profile, links, pendingNominations };
};

export const actions: Actions = {
	// Bild-Upload läuft als eigene Action (JS-Fetch aus PhotoUpload.svelte),
	// getrennt vom eigentlichen Formular-Save, damit die Vorschau sofort nach
	// dem Hochladen verfügbar ist, ohne das restliche Formular abzuschicken.
	// Der neue Avatar wird direkt hier persistiert (nicht erst beim Speichern
	// des restlichen Profils) - ein Profilbild-Upload ist für Nutzer:innen ein
	// abgeschlossener, für sich stehender Vorgang ("hochgeladen" = "gesetzt"),
	// kein Formularfeld, das noch einen separaten "Speichern"-Klick braucht.
	// `updateMyProfile.mutate({ avatarS3Key })` bekommt bewusst NUR dieses eine
	// Feld übergeben (kein Objekt aus FormData-Werten) - alle anderen Felder
	// bleiben dadurch `undefined` und werden von `upsertProfile`
	// (backend/src/routers/users.ts) unangetastet gelassen, insbesondere
	// `isPublic`: über FormData gelesen würde ein fehlendes Checkbox-Feld als
	// explizites `false` ankommen und ein öffentliches Profil ungewollt privat
	// stellen.
	uploadAvatar: async ({ request, locals, url }) => {
		try {
			await locals.trpc.users.me.query();
		} catch {
			redirect(302, `/auth/login?redirectTo=${encodeURIComponent(url.pathname)}`);
		}

		const formData = await request.formData();
		const contentType = formData.get('contentType') as string;
		const file = formData.get('file') as File;

		if (!file || file.size === 0) {
			return fail(400, { error: 'Keine Datei ausgewählt' });
		}

		try {
			// base64, nicht der rohe Buffer: der tRPC-Client läuft ohne
			// Transformer, ein Buffer würde beim JSON-Transport zu
			// `{type:'Buffer', data:[...]}` degenerieren (siehe uploads.ts Backend).
			const buffer = Buffer.from(await file.arrayBuffer()).toString('base64');
			const result = await locals.trpc.uploads.uploadAvatarPhoto.mutate({
				contentType: contentType as 'image/jpeg' | 'image/png',
				buffer
			});
			await locals.trpc.users.updateMyProfile.mutate({ avatarS3Key: result.s3Key });
			return { success: true, s3Key: result.s3Key };
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : 'Upload fehlgeschlagen'
			});
		}
	},

	// Gegenstück zu uploadAvatar - entfernt ein bereits gesetztes Profilbild
	// wieder (Button in PhotoUpload.svelte, siehe +page.svelte).
	removeAvatar: async ({ locals, url }) => {
		try {
			await locals.trpc.users.me.query();
		} catch {
			redirect(302, `/auth/login?redirectTo=${encodeURIComponent(url.pathname)}`);
		}

		try {
			await locals.trpc.users.removeAvatar.mutate();
			return { success: true };
		} catch (err) {
			return fail(400, {
				error: trpcErrorMessage(err, 'Profilbild konnte nicht entfernt werden.')
			});
		}
	},

	updateProfile: async ({ request, locals }) => {
		const formData = await request.formData();
		const raw = {
			displayName: formData.get('displayName') || undefined,
			websiteUrl: formData.get('websiteUrl') || undefined,
			instagramUrl: formData.get('instagramUrl') || undefined,
			facebookUrl: formData.get('facebookUrl') || undefined,
			tiktokUrl: formData.get('tiktokUrl') || undefined,
			bio: formData.get('bio') || undefined,
			isPublic: formData.get('isPublic') === 'on'
		};

		const parsed = updateProfileInputSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { fieldErrors: parsed.error.flatten().fieldErrors });
		}

		// Öffentliches Profil braucht einen Anzeigenamen, sonst gäbe es keine
		// sinnvolle Veranstalter-Seite (AGENTS.md Abschnitt 3).
		if (parsed.data.isPublic && !parsed.data.displayName) {
			return fail(400, {
				fieldErrors: {
					displayName: ['Anzeigename ist nötig, um das Profil öffentlich zu stellen.']
				}
			});
		}

		try {
			await locals.trpc.users.updateMyProfile.mutate(parsed.data);
		} catch (err) {
			return fail(400, {
				profileError: trpcErrorMessage(err, 'Profil konnte nicht gespeichert werden.')
			});
		}
		return { success: true };
	},

	requestVerification: async ({ locals }) => {
		try {
			const result = await locals.trpc.users.requestVerification.mutate();
			return { verificationRequested: true, ...result };
		} catch (err) {
			return fail(400, {
				verificationError: trpcErrorMessage(err, 'Verifizierung konnte nicht angefordert werden.')
			});
		}
	},

	// Bestätigen/Ablehnen einer Organizer-Nominierung (AGENTS.md 5.3) - der
	// nominierte Profil-Inhaber entscheidet selbst, alternativ ein Moderator.
	confirmNomination: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');
		try {
			await locals.trpc.organizerNominations.confirm.mutate({ id });
		} catch (err) {
			return fail(400, {
				nominationError: trpcErrorMessage(err, 'Bestätigung fehlgeschlagen.')
			});
		}
		return { nominationHandled: true };
	},

	rejectNomination: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');
		try {
			await locals.trpc.organizerNominations.reject.mutate({ id });
		} catch (err) {
			return fail(400, {
				nominationError: trpcErrorMessage(err, 'Ablehnen fehlgeschlagen.')
			});
		}
		return { nominationHandled: true };
	}
};
