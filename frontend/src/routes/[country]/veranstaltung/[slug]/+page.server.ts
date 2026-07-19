import { error, fail, redirect } from '@sveltejs/kit';
import { COUNTRIES, type Country } from '@dorfpartys/shared';
import type { Actions, PageServerLoad } from './$types.js';

function isCountry(value: string): value is Country {
	return (COUNTRIES as readonly string[]).includes(value);
}

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!isCountry(params.country)) {
		error(404);
	}

	try {
		const event = await locals.trpc.events.getBySlug.query({
			country: params.country,
			slug: params.slug
		});
		return { event, country: params.country };
	} catch {
		error(404, 'Event nicht gefunden');
	}
};

export const actions: Actions = {
	// Merken/Entmerken (AGENTS.md item 2, /partyliste) — Login-Pflicht, sonst
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
	}
};
