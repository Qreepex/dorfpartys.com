import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { COUNTRIES } from '@dorfpartys/shared';
import { bundesland, kreis, partyArt } from '../db/schema.js';
import { publicProcedure, router } from '../trpc/trpc.js';

export const taxonomyRouter = router({
	bundeslaender: publicProcedure.input(z.object({ country: z.enum(COUNTRIES) })).query(
		async ({ ctx, input }) =>
			ctx.db
				.select({ id: bundesland.id, slug: bundesland.slug, name: bundesland.name })
				.from(bundesland)
				.where(eq(bundesland.country, input.country))
	),

	kreise: publicProcedure.input(z.object({ bundeslandId: z.string().uuid() })).query(
		async ({ ctx, input }) =>
			ctx.db
				.select({ id: kreis.id, slug: kreis.slug, name: kreis.name })
				.from(kreis)
				.where(eq(kreis.bundeslandId, input.bundeslandId))
	),

	partyArten: publicProcedure.query(async ({ ctx }) =>
		ctx.db
			.select({ id: partyArt.id, slug: partyArt.slug, name: partyArt.name })
			.from(partyArt)
			.where(eq(partyArt.active, true))
	)
});
