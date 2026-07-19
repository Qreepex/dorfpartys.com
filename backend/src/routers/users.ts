import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  completeOnboardingInputSchema,
  updateProfileInputSchema,
  type UpdateProfileInput,
} from "@dorfpartys/shared";
import {
  bundesland,
  event,
  kreis,
  partyArt,
  user,
  userLink,
  userProfile,
} from "../db/schema.js";
import { generateUniqueOrganizerSlug } from "../slug/index.js";
import { buildPublicStorageUrl, deleteS3Object } from "../storage/index.js";
import { protectedProcedure, publicProcedure, router } from "../trpc/trpc.js";
import type { Database } from "../db/index.js";

/**
 * Gemeinsame Upsert-Logik für `updateMyProfile` und `completeOnboarding`
 * (Onboarding-Formular, AGENTS.md Abschnitt 5) — inkl. Slug-Neuvergabe bei
 * geändertem Anzeigenamen (Veranstalter-Seite, AGENTS.md 3/8).
 */
async function upsertProfile(
  db: Database,
  userId: string,
  profileFields: Omit<UpdateProfileInput, "links">,
) {
  if (profileFields.avatarS3Key) {
    const [existing] = await db
      .select({ avatarS3Key: userProfile.avatarS3Key })
      .from(userProfile)
      .where(eq(userProfile.userId, userId));
    // Alter Avatar-Key wird aktiv aus S3 entfernt — keine verwaisten
    // öffentlichen Dateien (AGENTS.md 7.1).
    if (
      existing?.avatarS3Key &&
      existing.avatarS3Key !== profileFields.avatarS3Key
    ) {
      await deleteS3Object(existing.avatarS3Key);
    }
  }

  let slugUpdate: { slug: string } | Record<string, never> = {};
  if (profileFields.displayName) {
    const [existing] = await db
      .select({ displayName: userProfile.displayName, slug: userProfile.slug })
      .from(userProfile)
      .where(eq(userProfile.userId, userId));
    if (!existing?.slug || existing.displayName !== profileFields.displayName) {
      slugUpdate = {
        slug: await generateUniqueOrganizerSlug(
          db,
          profileFields.displayName,
          userId,
        ),
      };
    }
  }

  await db
    .insert(userProfile)
    .values({ userId, ...profileFields, ...slugUpdate, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userProfile.userId,
      set: { ...profileFields, ...slugUpdate, updatedAt: new Date() },
    });
}

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
      // Private Profile sind unter ihrer URL nicht erreichbar (AGENTS.md
      // Abschnitt 3) — wie "nicht gefunden" behandelt, kein Hinweis auf Existenz.
      if (!profileRow || !profileRow.isPublic) return null;

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
            and(
              eq(event.organizerUserId, profileRow.userId),
              eq(event.status, "approved"),
            ),
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
      await upsertProfile(ctx.db, ctx.user.id, profileFields);

      if (links) {
        await ctx.db.delete(userLink).where(eq(userLink.userId, ctx.user.id));
        if (links.length > 0) {
          await ctx.db.insert(userLink).values(
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

  // Registrierungs-Multi-Step-Formular nach dem ersten Authentik-Login
  // (AGENTS.md Abschnitt 5) — legt den Anzeigenamen/Veranstalter-Profil an
  // und markiert das Onboarding als abgeschlossen.
  completeOnboarding: protectedProcedure
    .input(completeOnboardingInputSchema)
    .mutation(async ({ ctx, input }) => {
      await upsertProfile(ctx.db, ctx.user.id, input);
      await ctx.db
        .update(user)
        .set({ onboardingCompletedAt: new Date() })
        .where(eq(user.id, ctx.user.id));
      return { userId: ctx.user.id };
    }),

  // "Später einrichten" — Onboarding gilt als gesehen, ohne Profildaten zu setzen.
  skipOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(user)
      .set({ onboardingCompletedAt: new Date() })
      .where(eq(user.id, ctx.user.id));
    return { userId: ctx.user.id };
  }),
});
