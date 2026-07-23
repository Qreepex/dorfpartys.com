import { buildOrganizerUrl } from '@dorfpartys/shared';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const result = await locals.trpc.users.getProfileBySlug.query({ slug: params.slug });
	if (!result) {
		error(404, 'Veranstalter nicht gefunden');
	}

	// Übernommener Ghost-Account (AGENTS.md 5.4) - dauerhafter Redirect auf das
	// neue Profil statt 404, erhält den SEO-Wert alter Links.
	if ('redirect' in result) {
		redirect(301, buildOrganizerUrl(result.redirect));
	}

	let currentUserId: string | null = null;
	let ownVerified = false;
	let claimStatus: 'pending' | 'approved' | 'rejected' | null = null;
	try {
		const me = await locals.trpc.users.me.query();
		currentUserId = me.id;
		if (result.profile.isGhost) {
			const { profile: ownProfile } = await locals.trpc.users.getProfile.query({
				userId: me.id
			});
			ownVerified = !!ownProfile?.verifiedAt;
			const status = await locals.trpc.accountClaims.myClaimStatus.query({
				ghostUserId: result.profile.userId
			});
			claimStatus = status.status;
		}
	} catch {
		// nicht eingeloggt - kein Claim-Status verfügbar
	}

	return { ...result, currentUserId, ownVerified, claimStatus };
};

export const actions: Actions = {
	// "Gehört das Profil zu dir?" (AGENTS.md 5.4) - verifizierte Veranstalter
	// fragen die Übernahme eines Ghost-Accounts an.
	claimAccount: async ({ request, locals, url }) => {
		const formData = await request.formData();
		const ghostUserId = String(formData.get('ghostUserId') ?? '');
		const reason = String(formData.get('reason') ?? '').trim();

		try {
			await locals.trpc.users.me.query();
		} catch {
			redirect(302, `/auth/login?redirectTo=${encodeURIComponent(url.pathname)}`);
		}

		if (!ghostUserId) {
			return fail(400, { claimError: 'Unbekanntes Profil' });
		}

		try {
			await locals.trpc.accountClaims.create.mutate({
				ghostUserId,
				reason: reason || undefined
			});
		} catch (err) {
			return fail(400, {
				claimError: err instanceof Error ? err.message : 'Anfrage fehlgeschlagen'
			});
		}

		return { claimed: true };
	}
};
