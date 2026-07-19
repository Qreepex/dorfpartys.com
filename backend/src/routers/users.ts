import {
  completeOnboardingInputSchema,
  updateProfileInputSchema,
  type UpdateProfileInput
} from "@dorfpartys/shared";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db/index.js";
import {
  bundesland,
  event,
  kreis,
  partyArt,
  user,
  userLink,
  userProfile,
} from "../db/schema.js";
import { sanitizeText } from "../sanitization/index.js";
import { generateUniqueOrganizerSlug } from "../slug/index.js";
import { isSlugAvailable, validateSlugFormat } from "../slug/validation.js";
import { buildPublicStorageUrl, deleteS3Object } from "../storage/index.js";
import { protectedProcedure, publicProcedure, router } from "../trpc/trpc.js";
import {
  generateVerificationCode,
  isVerificationRelevantChange,
} from "../verification/index.js";

/**
 * Gemeinsame Upsert-Logik für `updateMyProfile` und `completeOnboarding`
 * (Onboarding-Formular, AGENTS.md Abschnitt 5) - inkl. Slug-Neuvergabe bei
 * geändertem Anzeigenamen (Veranstalter-Seite, AGENTS.md 3/8).
 * Sanitiert User-Input vor Ablage in der DB.
 */
async function upsertProfile(
  db: Database,
  userId: string,
  profileFields: Omit<UpdateProfileInput, "links">,
) {
  // Sanitiere Textfelder
  const sanitized = {
    ...profileFields,
    displayName: profileFields.displayName ? sanitizeText(profileFields.displayName) : profileFields.displayName,
    bio: profileFields.bio ? sanitizeText(profileFields.bio) : profileFields.bio,
  };
  if (sanitized.avatarS3Key) {
    const [existing] = await db
      .select({ avatarS3Key: userProfile.avatarS3Key })
      .from(userProfile)
      .where(eq(userProfile.userId, userId));
    // Alter Avatar-Key wird aktiv aus S3 entfernt - keine verwaisten
    // öffentlichen Dateien (AGENTS.md 7.1).
    if (
      existing?.avatarS3Key &&
      existing.avatarS3Key !== sanitized.avatarS3Key
    ) {
      await deleteS3Object(existing.avatarS3Key);
    }
  }

  let slugUpdate: { slug: string } | Record<string, never> = {};
  let verificationReset: Record<string, null> = {};

  const [existing] = await db
    .select({
      displayName: userProfile.displayName,
      slug: userProfile.slug,
      websiteUrl: userProfile.websiteUrl,
      instagramUrl: userProfile.instagramUrl,
      tiktokUrl: userProfile.tiktokUrl,
      facebookUrl: userProfile.facebookUrl,
      verifiedAt: userProfile.verifiedAt,
    })
    .from(userProfile)
    .where(eq(userProfile.userId, userId));

  // Slug-Handling: Benutzer kann einen Custom-Slug setzen, sonst auto-generieren
  if (sanitized.slug) {
    // Benutzer hat einen custom Slug eingegeben - validieren
    const validation = validateSlugFormat(sanitized.slug);
    if (!validation.valid) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: validation.error,
      });
    }

    // Prüfe Eindeutigkeit
    const available = await isSlugAvailable(db, sanitized.slug, userId);
    if (!available) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Der Slug "${sanitized.slug}" ist bereits vergeben`,
      });
    }

    slugUpdate = { slug: sanitized.slug };
  } else if (sanitized.displayName) {
    // Kein custom slug, auto-generieren aus displayName
    if (!existing?.slug || existing.displayName !== sanitized.displayName) {
      slugUpdate = {
        slug: await generateUniqueOrganizerSlug(
          db,
          sanitized.displayName,
          userId,
        ),
      };
    }
  }

  // Wenn sich eine verifizierungsrelevante Profilfeld ändert, Reset der Verifizierung
  if (existing?.verifiedAt && isVerificationRelevantChange(existing, sanitized)) {
    verificationReset = {
      verifiedAt: null,
      verificationMethod: null,
      verificationCode: null,
      verificationRequestedAt: null,
      verifiedInstagramHandle: null,
      verifiedTiktokHandle: null,
    };
  }

  await db
    .insert(userProfile)
    .values({
      userId,
      ...sanitized,
      ...slugUpdate,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userProfile.userId,
      set: {
        ...sanitized,
        ...slugUpdate,
        ...verificationReset,
        updatedAt: new Date(),
      },
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

  // Öffentliche Veranstalter-Seite //veranstalter/{slug}/ (AGENTS.md 3/8).
  getProfileBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [profileRow] = await ctx.db
        .select({
          userId: userProfile.userId,
          slug: userProfile.slug,
          isPublic: userProfile.isPublic,
          displayName: userProfile.displayName,
          avatarS3Key: userProfile.avatarS3Key,
          websiteUrl: userProfile.websiteUrl,
          instagramUrl: userProfile.instagramUrl,
          facebookUrl: userProfile.facebookUrl,
          tiktokUrl: userProfile.tiktokUrl,
          bio: userProfile.bio,
          verifiedAt: userProfile.verifiedAt,
          verificationMethod: userProfile.verificationMethod,
          updatedAt: userProfile.updatedAt,
        })
        .from(userProfile)
        .where(eq(userProfile.slug, input.slug));
      // Private Profile sind unter ihrer URL nicht erreichbar (AGENTS.md
      // Abschnitt 3) - wie "nicht gefunden" behandelt, kein Hinweis auf Existenz.
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
              label: sanitizeText(l.label),
              position: l.position,
            })),
          );
        }
      }

      return { userId: ctx.user.id };
    }),

  // Registrierungs-Multi-Step-Formular nach dem ersten Authentik-Login
  // (AGENTS.md Abschnitt 5) - legt den Anzeigenamen/Veranstalter-Profil an
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

  // "Später einrichten" - Onboarding gilt als gesehen, ohne Profildaten zu setzen.
  skipOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(user)
      .set({ onboardingCompletedAt: new Date() })
      .where(eq(user.id, ctx.user.id));
    return { userId: ctx.user.id };
  }),

  // Verifizierungsanfrage: generiert einen Code, den der User per Mail/DM schicken kann.
  // Erfordert displayName und mindestens einen verifizierbaren Kanal (Website, Insta, TikTok).
  requestVerification: protectedProcedure.mutation(async ({ ctx }) => {
    const [profile] = await ctx.db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, ctx.user.id));

    if (!profile) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Bitte richte zunächst dein Profil ein.",
      });
    }

    if (!profile.displayName) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Bitte lege einen Anzeigenamen fest.",
      });
    }

    // Mindestens ein Kanal muss vorhanden sein
    const hasEmail = !!profile.websiteUrl;
    const hasInstagram = !!profile.instagramUrl;
    const hasTiktok = !!profile.tiktokUrl;

    if (!hasEmail && !hasInstagram && !hasTiktok) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Bitte hinterlege mindestens einen Kanal: Website, Instagram oder TikTok.",
      });
    }

    const code = generateVerificationCode();

    await ctx.db
      .update(userProfile)
      .set({
        verificationCode: code,
        verificationRequestedAt: new Date(),
      })
      .where(eq(userProfile.userId, ctx.user.id));

    return {
      code,
      channels: { email: hasEmail, instagram: hasInstagram, tiktok: hasTiktok },
    };
  }),
});
