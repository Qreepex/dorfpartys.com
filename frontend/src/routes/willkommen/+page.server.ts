import { fail, redirect } from '@sveltejs/kit';
import { completeOnboardingInputSchema } from '@dorfpartys/shared';
import { requireUser } from '$lib/server/require-auth.js';
import type { Actions, PageServerLoad } from './$types.js';

function safeRedirectTarget(value: FormDataEntryValue | string | null): string {
	return typeof value === 'string' && value.startsWith('/') ? value : '/';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireUser(locals.trpc, url.pathname);
	// Als Hidden-Field durchgereicht: `action="?/complete"` ersetzt beim Absenden
	// die komplette Query-String der Seite, ein `?redirectTo=...` aus der URL
	// würde sonst beim Submit verloren gehen.
	return { redirectTo: safeRedirectTarget(url.searchParams.get('redirectTo')) };
};

export const actions: Actions = {
	complete: async ({ request, locals }) => {
		const formData = await request.formData();
		const raw = {
			displayName: formData.get('displayName'),
			websiteUrl: formData.get('websiteUrl') || undefined,
			instagramUrl: formData.get('instagramUrl') || undefined,
			bio: formData.get('bio') || undefined
		};

		const parsed = completeOnboardingInputSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { fieldErrors: parsed.error.flatten().fieldErrors });
		}

		await locals.trpc.users.completeOnboarding.mutate(parsed.data);
		redirect(303, safeRedirectTarget(formData.get('redirectTo')));
	},

	skip: async ({ request, locals }) => {
		const formData = await request.formData();
		await locals.trpc.users.skipOnboarding.mutate();
		redirect(303, safeRedirectTarget(formData.get('redirectTo')));
	}
};
