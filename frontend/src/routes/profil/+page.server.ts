import { fail } from '@sveltejs/kit';
import { updateProfileInputSchema } from '@dorfpartys/shared';
import { requireUser } from '$lib/server/require-auth.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await requireUser(locals.trpc, url.pathname);
	const { profile, links } = await locals.trpc.users.getProfile.query({ userId: user.id });
	return { profile, links };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const raw = {
			displayName: formData.get('displayName') || undefined,
			websiteUrl: formData.get('websiteUrl') || undefined,
			instagramUrl: formData.get('instagramUrl') || undefined,
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
	}
};
