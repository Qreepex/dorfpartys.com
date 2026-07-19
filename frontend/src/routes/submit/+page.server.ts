import { fail } from '@sveltejs/kit';
import { COUNTRIES, submitEventInputSchema } from '@dorfpartys/shared';
import { requireUser } from '$lib/server/require-auth.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireUser(locals.trpc, url.pathname);

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

	return { partyArten, bundeslaenderByCountry };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();

		const startDateRaw = formData.get('startDate');
		const endDateRaw = formData.get('endDate');
		const minAgeRaw = formData.get('minAge');

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
			requiresMuttizettel: formData.get('requiresMuttizettel') === 'on',
			isOutdoor: formData.get('isOutdoor') === 'on'
		};

		const parsed = submitEventInputSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { fieldErrors: parsed.error.flatten().fieldErrors });
		}

		try {
			const created = await locals.trpc.events.create.mutate(parsed.data);
			await locals.trpc.events.submitForReview.mutate({ id: created.id });
		} catch (err) {
			return fail(400, { error: err instanceof Error ? err.message : 'Einreichung fehlgeschlagen' });
		}

		return { success: true };
	}
};
