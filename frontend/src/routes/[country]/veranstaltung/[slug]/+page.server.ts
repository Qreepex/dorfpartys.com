import { COUNTRIES, type Country } from '@dorfpartys/shared';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

function isCountry(value: string): value is Country {
	return (COUNTRIES as readonly string[]).includes(value);
}

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!isCountry(params.country)) {
		error(404);
	}

	let event;
	try {
		event = await locals.trpc.events.getBySlug.query({
			country: params.country,
			slug: params.slug
		});
	} catch {
		error(404, 'Event nicht gefunden');
	}

	let currentUserId: string | null = null;
	let claimStatus: 'pending' | 'approved' | 'rejected' | null = null;
	try {
		const me = await locals.trpc.users.me.query();
		currentUserId = me.id;
		if (!event.organizerVerified && event.organizerUserId !== me.id) {
			const result = await locals.trpc.eventClaims.myClaimStatus.query({ eventId: event.id });
			claimStatus = result.status;
		}
	} catch {
		// nicht eingeloggt - kein Claim-/Bearbeiten-Status verfügbar
	}

	return { event, country: params.country, currentUserId, claimStatus };
};

export const actions: Actions = {
	// Merken/Entmerken (AGENTS.md item 2, /partyliste) - Login-Pflicht, sonst
	// zurück zum Login mit Rücksprung auf die aktuelle Event-Seite.
	toggleSave: async ({ request, locals, url }) => {
		const formData = await request.formData();
		const eventId = String(formData.get('eventId') ?? '');
		const wasSaved = formData.get('isSaved') === 'true';

		try {
			await locals.trpc.users.me.query();
		} catch {
			redirect(302, `/auth/login?redirectTo=${encodeURIComponent(url.pathname)}`);
		}

		if (!eventId) {
			return fail(400, { error: 'Unbekanntes Event' });
		}

		if (wasSaved) {
			await locals.trpc.savedEvents.unsave.mutate({ eventId });
		} else {
			await locals.trpc.savedEvents.save.mutate({ eventId });
		}

		return { saveToggled: true };
	},

	// "Dieses Event verwalten" (AGENTS.md 5.4) - verifizierte Veranstalter
	// fragen die Übernahme eines nicht-verifizierten Events an.
	claimEvent: async ({ request, locals, url }) => {
		const formData = await request.formData();
		const eventId = String(formData.get('eventId') ?? '');
		const reason = String(formData.get('reason') ?? '').trim();

		try {
			await locals.trpc.users.me.query();
		} catch {
			redirect(302, `/auth/login?redirectTo=${encodeURIComponent(url.pathname)}`);
		}

		if (!eventId) {
			return fail(400, { claimError: 'Unbekanntes Event' });
		}

		try {
			await locals.trpc.eventClaims.create.mutate({
				eventId,
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
