import {
  completeOnboardingInputSchema,
  updateProfileInputSchema,
  type UpdateProfileInput,
} from "@dorfpartys/shared";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, inArray, isNull } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import { z } from "zod";
import type { Database } from "../db/index.js";
import {
  bundesland,
  event,
  kreis,
  organizerNomination,
  partyArt,
  user,
  userLink,
  userProfile,
} from "../db/schema.js";
import { sanitizeText } from "../sanitization/index.js";
import { generateUniqueOrganizerSlug } from "../slug/index.js";
import { isSlugAvailable, validateSlugFormat } from "../slug/validation.js";
import {
  buildPublicStorageUrl,
  confirmUpload,
  deleteS3Object,
} from "../storage/index.js";
import { protectedProcedure, publicProcedure, router } from "../trpc/trpc.js";
import {
  generateVerificationCode,
  isVerificationRelevantChange,
} from "../verification/index.js";
import { redeemInviteCode } from "../invite-codes/index.js";

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
  log: FastifyBaseLogger,
) {
  // Sanitiere Textfelder
  const sanitized = {
    ...profileFields,
    displayName: profileFields.displayName
      ? sanitizeText(profileFields.displayName)
      : profileFields.displayName,
    bio: profileFields.bio
      ? sanitizeText(profileFields.bio)
      : profileFields.bio,
  };
  if (sanitized.avatarS3Key) {
    const [existing] = await db
      .select({ avatarS3Key: userProfile.avatarS3Key })
      .from(userProfile)
      .where(eq(userProfile.userId, userId));
    // Alter Avatar-Key wird aktiv aus S3 entfernt - keine verwaisten
    // öffentlichen Dateien (AGENTS.md 7.1). `deleteS3Object` ist bewusst
    // best-effort (siehe dort) - ein Fehler hier (z.B. fehlende
    // `s3:DeleteObject`-Berechtigung) darf das eigentliche Setzen des neuen
    // Avatars unten nicht verhindern.
    if (
      existing?.avatarS3Key &&
      existing.avatarS3Key !== sanitized.avatarS3Key
    ) {
      await deleteS3Object(existing.avatarS3Key, log);
    }

    // Jetzt an ein echtes Profil angehängt - nicht mehr "pending", der Sweep
    // (backend/src/index.ts) darf ihn nicht mehr löschen.
    await confirmUpload(db, sanitized.avatarS3Key);
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
  if (
    existing?.verifiedAt &&
    isVerificationRelevantChange(existing, sanitized)
  ) {
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
  // Liefert zusätzlich zu den Kern-User-Feldern eine schlanke Profil-Vorschau
  // (Anzeigename/Avatar) für die Navbar-User-Card - kein vollständiger
  // getProfile()-Aufruf nötig, um Login-Status + Anzeige gemeinsam zu laden.
  me: protectedProcedure.query(async ({ ctx }) => {
    const [profileRow] = await ctx.db
      .select({
        displayName: userProfile.displayName,
        avatarS3Key: userProfile.avatarS3Key,
      })
      .from(userProfile)
      .where(eq(userProfile.userId, ctx.user.id));

    return {
      ...ctx.user,
      displayName: profileRow?.displayName ?? null,
      avatarUrl: profileRow?.avatarS3Key
        ? buildPublicStorageUrl(profileRow.avatarS3Key)
        : null,
    };
  }),

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

      return {
        profile: profileRow
          ? {
              ...profileRow,
              avatarUrl: profileRow.avatarS3Key
                ? buildPublicStorageUrl(profileRow.avatarS3Key)
                : null,
            }
          : null,
        links,
      };
    }),

  // Autofill-Suche für die Veranstalter-Auswahl beim Eintragen einer
  // Veranstaltung (AGENTS.md 5.3) - findet echte öffentliche Profile und
  // Ghost-Accounts, aber keine bereits übernommenen (mergedIntoUserId) Profile.
  searchOrganizers: publicProcedure
    .input(z.object({ query: z.string().trim().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          userId: userProfile.userId,
          slug: userProfile.slug,
          displayName: userProfile.displayName,
          avatarS3Key: userProfile.avatarS3Key,
          verifiedAt: userProfile.verifiedAt,
          isGhost: user.isGhost,
        })
        .from(userProfile)
        .innerJoin(user, eq(user.id, userProfile.userId))
        .where(
          and(
            eq(userProfile.isPublic, true),
            isNull(userProfile.mergedIntoUserId),
            ilike(userProfile.displayName, `%${input.query}%`),
          ),
        )
        .orderBy(desc(userProfile.verifiedAt))
        .limit(10);

      return rows.map((row) => ({
        userId: row.userId,
        slug: row.slug,
        displayName: row.displayName,
        avatarUrl: row.avatarS3Key
          ? buildPublicStorageUrl(row.avatarS3Key)
          : null,
        verified: !!row.verifiedAt,
        isGhost: row.isGhost,
      }));
    }),

  // Offene Organizer-Nominierungen, bei denen der eingeloggte User selbst
  // nominiert wurde - Anzeige/Bestätigung auf /profil (AGENTS.md 5.3).
  pendingOrganizerNominations: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: organizerNomination.id,
        requestedAt: organizerNomination.requestedAt,
        eventId: event.id,
        eventTitle: event.title,
        eventSlug: event.slug,
        country: bundesland.country,
      })
      .from(organizerNomination)
      .innerJoin(event, eq(organizerNomination.eventId, event.id))
      .innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
      .where(
        and(
          eq(organizerNomination.nominatedUserId, ctx.user.id),
          eq(organizerNomination.status, "pending"),
        ),
      )
      .orderBy(organizerNomination.requestedAt);
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
          mergedIntoUserId: userProfile.mergedIntoUserId,
          isGhost: user.isGhost,
        })
        .from(userProfile)
        .innerJoin(user, eq(user.id, userProfile.userId))
        .where(eq(userProfile.slug, input.slug));
      if (!profileRow) return null;

      // Ghost-Profil wurde übernommen (AGENTS.md 5.4) - dauerhafter Redirect
      // auf das neue Profil statt 404, erhält den SEO-Wert alter Links.
      if (profileRow.mergedIntoUserId) {
        const [target] = await ctx.db
          .select({ slug: userProfile.slug })
          .from(userProfile)
          .where(eq(userProfile.userId, profileRow.mergedIntoUserId));
        if (target?.slug) {
          return { redirect: target.slug } as const;
        }
      }

      // Private Profile sind unter ihrer URL nicht erreichbar (AGENTS.md
      // Abschnitt 3) - wie "nicht gefunden" behandelt, kein Hinweis auf Existenz.
      if (!profileRow.isPublic) return null;

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

      // Effektives Enddatum + dateless-Handling analog
      // resolver/event-date-filters.ts und routers/saved-events.ts: endDate
      // falls gesetzt, sonst startDate als Fallback; kein startDate ("dateless",
      // AGENTS.md 5) zählt immer als "kommend".
      function effectiveEndMs(e: (typeof events)[number]): number | null {
        const fallback = e.endDate ?? e.startDate;
        return fallback ? new Date(fallback).getTime() : null;
      }
      function startMs(
        e: (typeof events)[number],
        fallbackForPast = false,
      ): number {
        if (e.startDate) return +new Date(e.startDate);
        return fallbackForPast ? 0 : Infinity;
      }

      const now = Date.now();
      const upcoming = events
        .filter((e) => {
          const end = effectiveEndMs(e);
          return end === null || end >= now;
        })
        .sort((a, b) => startMs(a) - startMs(b));
      const past = events
        .filter((e) => {
          const end = effectiveEndMs(e);
          return end !== null && end < now;
        })
        .sort((a, b) => startMs(b, true) - startMs(a, true));

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

      // Privat-Stellen erst erlauben, wenn dem Profil keine eigenen
      // Veranstaltungen mehr zugeordnet sind - sonst verschwindet die
      // öffentliche Veranstalter-Seite (AGENTS.md Abschnitt 3), obwohl der
      // Veranstalter-Name auf den Event-Seiten weiterhin referenziert wird.
      // draft/in_review/approved zählen alle noch als "seine" Veranstaltungen,
      // nur rejected blockiert nicht.
      if (profileFields.isPublic === false) {
        const blockingEvents = await ctx.db
          .select({ id: event.id })
          .from(event)
          .where(
            and(
              eq(event.organizerUserId, ctx.user.id),
              inArray(event.status, ["draft", "in_review", "approved"]),
            ),
          )
          .limit(1);

        if (blockingEvents.length > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Dein Profil kann nicht privat gestellt werden, solange dir noch Veranstaltungen zugeordnet sind. Lösche zuerst deine Veranstaltungen unter 'Meine Veranstaltungen'.",
          });
        }
      }

      await upsertProfile(ctx.db, ctx.user.id, profileFields, ctx.req.log);

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

  // Entfernt das Profilbild wieder (Gegenstück zum Upload, siehe
  // uploads.uploadAvatarPhoto) - eigene, schlanke Mutation statt einer
  // dritten Bedeutung von `avatarS3Key` in `updateMyProfile`
  // (undefined = unverändert lassen, string = setzen), das würde ein
  // `null` für "aktiv entfernen" brauchen und `upsertProfile`s
  // Skip-wenn-undefined-Semantik verkomplizieren.
  removeAvatar: protectedProcedure.mutation(async ({ ctx }) => {
    const [existing] = await ctx.db
      .select({ avatarS3Key: userProfile.avatarS3Key })
      .from(userProfile)
      .where(eq(userProfile.userId, ctx.user.id));

    if (!existing?.avatarS3Key) {
      return { userId: ctx.user.id };
    }

    // Best-effort (siehe deleteS3Object) - selbst wenn das Löschen in S3
    // fehlschlägt (z.B. fehlende Berechtigung), wird der Verweis in der DB
    // trotzdem entfernt, damit das Profil nicht auf eine kaputte/verwaiste
    // Datei zeigt.
    await deleteS3Object(existing.avatarS3Key, ctx.req.log);

    await ctx.db
      .update(userProfile)
      .set({ avatarS3Key: null, updatedAt: new Date() })
      .where(eq(userProfile.userId, ctx.user.id));

    return { userId: ctx.user.id };
  }),

  // Registrierungs-Multi-Step-Formular nach dem ersten Authentik-Login
  // (AGENTS.md Abschnitt 5) - legt den Anzeigenamen/Veranstalter-Profil an
  // und markiert das Onboarding als abgeschlossen.
  completeOnboarding: protectedProcedure
    .input(completeOnboardingInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { inviteCode, ...profileFields } = input;
      await upsertProfile(ctx.db, ctx.user.id, profileFields, ctx.req.log);
      await ctx.db
        .update(user)
        .set({ onboardingCompletedAt: new Date() })
        .where(eq(user.id, ctx.user.id));

      // Optionaler Einladungscode für die Übernahme eines vom Admin
      // vorbereiteten Ghost-Accounts (siehe backend/src/invite-codes/index.ts)
      // - ein ungültiger/bereits verwendeter Code wird bewusst still
      // ignoriert, blockiert das Onboarding aber nie.
      if (inviteCode) {
        await redeemInviteCode(ctx.db, ctx.user.id, inviteCode);
      }

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
