import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { updateProfileInputSchema } from '@dorfpartys/shared';
import { userLink, userProfile } from '../db/schema.js';
import { deleteS3Object } from '../storage/index.js';
import { protectedProcedure, publicProcedure, router } from '../trpc/trpc.js';

export const usersRouter = router({
	me: protectedProcedure.query(({ ctx }) => ctx.user),

	getProfile: publicProcedure.input(z.object({ userId: z.string().uuid() })).query(async ({ ctx, input }) => {
		const [profileRow] = await ctx.db.select().from(userProfile).where(eq(userProfile.userId, input.userId));
		const links = await ctx.db
			.select()
			.from(userLink)
			.where(eq(userLink.userId, input.userId))
			.orderBy(userLink.position);

		return { profile: profileRow ?? null, links };
	}),

	updateMyProfile: protectedProcedure.input(updateProfileInputSchema).mutation(async ({ ctx, input }) => {
		const { links, ...profileFields } = input;

		if (profileFields.avatarS3Key) {
			const [existing] = await ctx.db
				.select({ avatarS3Key: userProfile.avatarS3Key })
				.from(userProfile)
				.where(eq(userProfile.userId, ctx.user.id));
			// Alter Avatar-Key wird aktiv aus S3 entfernt — keine verwaisten
			// öffentlichen Dateien (AGENTS.md 7.1).
			if (existing?.avatarS3Key && existing.avatarS3Key !== profileFields.avatarS3Key) {
				await deleteS3Object(existing.avatarS3Key);
			}
		}

		await ctx.db
			.insert(userProfile)
			.values({ userId: ctx.user.id, ...profileFields, updatedAt: new Date() })
			.onConflictDoUpdate({
				target: userProfile.userId,
				set: { ...profileFields, updatedAt: new Date() }
			});

		if (links) {
			await ctx.db.delete(userLink).where(eq(userLink.userId, ctx.user.id));
			if (links.length > 0) {
				await ctx.db
					.insert(userLink)
					.values(links.map((l) => ({ userId: ctx.user.id, url: l.url, label: l.label, position: l.position })));
			}
		}

		return { userId: ctx.user.id };
	})
});
