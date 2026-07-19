import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { updateProfileInputSchema } from "@dorfpartys/shared";
import { bundesland, event, kreis, partyArt, userLink, userProfile } from "../db/schema.js";
import { generateUniqueOrganizerSlug } from "../slug/index.js";
import { buildPublicStorageUrl, deleteS3Object } from "../storage/index.js";
import { protectedProcedure, publicProcedure, router } from "../trpc/trpc.js";

export const usersRouter = router({
  me: protectedProcedure.query(({ ctx }) => ctx.user),

  getProfile: publicProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [profileRow] = await ctx.db
        .select()
        .from(userProfile)
        .where(eq(userProfile.userId, input.userId));
      const links = await ctx.db
        .select()
        .from(userLink)
        .where(eq(userLink.userId, input.userId))
        .orderBy(userLink.position);

      return { profile: profileRow ?? null, links };
    }),

  // Öffentliche Veranstalter-Seite /{country}/veranstalter/{slug}/ (AGENTS.md 3/8).
  getProfileBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [profileRow] = await ctx.db
        .select()
        .from(userProfile)
        .where(eq(userProfile.slug, input.slug));
      if (!profileRow) return null;

      const [links, events] = await Promise.all([
        ctx.db
          .select()
          .from(userLink)
          .where(eq(userLink.userId, profileRow.userId))
          .orderBy(userLink.position),
        ctx.db
          .select({
            slug: event.slug,
            title: event.title,
            startDate: event.startDate,
            endDate: event.endDate,
            customColor: event.customColor,
            country: bundesland.country,
            bundeslandName: bundesland.name,
            kreisName: kreis.name,
            partyArtName: partyArt.name,
          })
          .from(event)
          .innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
          .innerJoin(kreis, eq(event.kreisId, kreis.id))
          .innerJoin(partyArt, eq(event.partyArtId, partyArt.id))
          .where(
            and(eq(event.organizerUserId, profileRow.userId), eq(event.status, "approved")),
          ),
      ]);

      const now = Date.now();
      const upcoming = events
        .filter((e) => new Date(e.endDate).getTime() >= now)
        .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));
      const past = events
        .filter((e) => new Date(e.endDate).getTime() < now)
        .sort((a, b) => +new Date(b.startDate) - +new Date(a.startDate));

      return {
        profile: {
          ...profileRow,
          avatarUrl: profileRow.avatarS3Key
            ? buildPublicStorageUrl(profileRow.avatarS3Key)
            : null,
        },
        links,
        upcoming,
        past,
      };
    }),

  updateMyProfile: protectedProcedure
    .input(updateProfileInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { links, ...profileFields } = input;

      if (profileFields.avatarS3Key) {
        const [existing] = await ctx.db
          .select({ avatarS3Key: userProfile.avatarS3Key })
          .from(userProfile)
          .where(eq(userProfile.userId, ctx.user.id));
        // Alter Avatar-Key wird aktiv aus S3 entfernt — keine verwaisten
        // öffentlichen Dateien (AGENTS.md 7.1).
        if (
          existing?.avatarS3Key &&
          existing.avatarS3Key !== profileFields.avatarS3Key
        ) {
          await deleteS3Object(existing.avatarS3Key);
        }
      }

      // Slug wird bei jeder Änderung des Anzeigenamens neu aus diesem
      // abgeleitet (Veranstalter-Seite, AGENTS.md 3/8).
      let slugUpdate: { slug: string } | Record<string, never> = {};
      if (profileFields.displayName) {
        const [existing] = await ctx.db
          .select({ displayName: userProfile.displayName, slug: userProfile.slug })
          .from(userProfile)
          .where(eq(userProfile.userId, ctx.user.id));
        if (!existing?.slug || existing.displayName !== profileFields.displayName) {
          slugUpdate = {
            slug: await generateUniqueOrganizerSlug(
              ctx.db,
              profileFields.displayName,
              ctx.user.id,
            ),
          };
        }
      }

      await ctx.db
        .insert(userProfile)
        .values({
          userId: ctx.user.id,
          ...profileFields,
          ...slugUpdate,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userProfile.userId,
          set: { ...profileFields, ...slugUpdate, updatedAt: new Date() },
        });

      if (links) {
        await ctx.db.delete(userLink).where(eq(userLink.userId, ctx.user.id));
        if (links.length > 0) {
          await ctx.db
            .insert(userLink)
            .values(
              links.map((l) => ({
                userId: ctx.user.id,
                url: l.url,
                label: l.label,
                position: l.position,
              })),
            );
        }
      }

      return { userId: ctx.user.id };
    }),
});
