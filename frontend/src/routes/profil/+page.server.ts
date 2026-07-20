import { requireUser } from '$lib/server/require-auth.js';
import { updateProfileInputSchema } from '@dorfpartys/shared';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireUser(locals.trpc, url.pathname);
	const { profile, links } = await locals.trpc.users.getProfile.query({ userId: user.id });
	const pendingNominations = await locals.trpc.users.pendingOrganizerNominations.query();
	return { profile, links, pendingNominations };
};

export const actions: Actions = {
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

		await locals.trpc.users.updateMyProfile.mutate(parsed.data);
		return { success: true };
	},

	requestVerification: async ({ locals }) => {
		try {
			const result = await locals.trpc.users.requestVerification.mutate();
			return { verificationRequested: true, ...result };
		} catch (error: any) {
			return fail(400, {
				verificationError: error?.message || 'Verifizierung konnte nicht angefordert werden.'
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
		} catch (error: any) {
			return fail(400, {
				nominationError: error?.message || 'Bestätigung fehlgeschlagen.'
			});
		}
		return { nominationHandled: true };
	},

	rejectNomination: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');
		try {
			await locals.trpc.organizerNominations.reject.mutate({ id });
		} catch (error: any) {
			return fail(400, {
				nominationError: error?.message || 'Ablehnen fehlgeschlagen.'
			});
		}
		return { nominationHandled: true };
	}
};
