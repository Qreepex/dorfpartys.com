import {
  createGhostAccountInputSchema,
  generateGhostInviteCodeInputSchema,
  listGhostEventsInputSchema,
  updateGhostAccountInputSchema,
} from "@dorfpartys/shared";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  bundesland as bundeslandTable,
  event,
  kreis,
  organizerInviteCode,
  partyArt,
  user,
  userProfile,
} from "../db/schema.js";
import { generateUniqueInviteCode } from "../invite-codes/index.js";
import { sanitizeText } from "../sanitization/index.js";
import { generateUniqueOrganizerSlug } from "../slug/index.js";
import { adminProcedure, router } from "../trpc/trpc.js";

/**
 * Admin-Dashboard /review/ghost-accounts (AGENTS.md: "Ghost-Accounts &
 * Einladungscodes") - getrennt von account-claims.ts (moderierter Claim durch
 * einen bereits registrierten Veranstalter) und von der automatischen
 * Ghost-Account-Erzeugung in events.ts (Freitext-Veranstalter bei der
 * Einreichung). Hier legt der Admin proaktiv Ghost-Accounts an, um im Voraus
 * Veranstaltungen für noch nicht registrierte Veranstalter einzupflegen, und
 * generiert Einladungscodes, die er den echten Veranstaltern direkt zuschickt.
 * Nur "admin" (nicht "moderator"), da ein eingelöster Code sofortige
 * Verifizierung auslöst - sensibler als normale Review-Aktionen.
 */
export const ghostAccountsRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const ghosts = await ctx.db
      .select({
        userId: user.id,
        displayName: userProfile.displayName,
        slug: userProfile.slug,
        createdAt: user.createdAt,
      })
      .from(user)
      .innerJoin(userProfile, eq(userProfile.userId, user.id))
      .where(and(eq(user.isGhost, true), isNull(userProfile.mergedIntoUserId)))
      .orderBy(desc(user.createdAt));

    if (ghosts.length === 0) return [];
    const ghostIds = ghosts.map((g) => g.userId);

    const [eventCounts, codes] = await Promise.all([
      ctx.db
        .select({ organizerUserId: event.organizerUserId, total: count() })
        .from(event)
        .where(inArray(event.organizerUserId, ghostIds))
        .groupBy(event.organizerUserId),
      ctx.db
        .select({
          ghostUserId: organizerInviteCode.ghostUserId,
          code: organizerInviteCode.code,
          usedByUserId: organizerInviteCode.usedByUserId,
          usedAt: organizerInviteCode.usedAt,
          createdAt: organizerInviteCode.createdAt,
        })
        .from(organizerInviteCode)
        .where(inArray(organizerInviteCode.ghostUserId, ghostIds))
        .orderBy(desc(organizerInviteCode.createdAt)),
    ]);

    const redeemerIds = [
      ...new Set(
        codes
          .map((c) => c.usedByUserId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const redeemerProfiles = redeemerIds.length
      ? await ctx.db
          .select({
            userId: userProfile.userId,
            displayName: userProfile.displayName,
            slug: userProfile.slug,
          })
          .from(userProfile)
          .where(inArray(userProfile.userId, redeemerIds))
      : [];
    const redeemerById = new Map(redeemerProfiles.map((p) => [p.userId, p]));

    const eventCountByGhost = new Map(
      eventCounts.map((r) => [r.organizerUserId, r.total]),
    );
    // codes sind bereits nach createdAt DESC sortiert - der erste Treffer pro
    // Ghost ist der aktuellste Code.
    const latestCodeByGhost = new Map<string, (typeof codes)[number]>();
    for (const c of codes) {
      if (!latestCodeByGhost.has(c.ghostUserId)) {
        latestCodeByGhost.set(c.ghostUserId, c);
      }
    }

    return ghosts.map((g) => {
      const latestCode = latestCodeByGhost.get(g.userId) ?? null;
      const redeemer = latestCode?.usedByUserId
        ? (redeemerById.get(latestCode.usedByUserId) ?? null)
        : null;
      return {
        userId: g.userId,
        displayName: g.displayName,
        slug: g.slug,
        createdAt: g.createdAt,
        eventCount: eventCountByGhost.get(g.userId) ?? 0,
        invite: latestCode
          ? {
              code: latestCode.code,
              usedAt: latestCode.usedAt,
              usedByDisplayName: redeemer?.displayName ?? null,
              usedBySlug: redeemer?.slug ?? null,
              createdAt: latestCode.createdAt,
            }
          : null,
      };
    });
  }),

  create: adminProcedure
    .input(createGhostAccountInputSchema)
    .mutation(async ({ ctx, input }) => {
      const displayName = sanitizeText(input.displayName);
      if (!displayName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Anzeigename darf nicht leer sein",
        });
      }

      const [ghost] = await ctx.db
        .insert(user)
        .values({
          authentikSubject: null,
          role: "user",
          isGhost: true,
          onboardingCompletedAt: new Date(),
        })
        .returning({ id: user.id });

      const slug = await generateUniqueOrganizerSlug(
        ctx.db,
        displayName,
        ghost.id,
      );

      // isPublic: true, damit vom Admin eingetragene Veranstaltungen für
      // diesen Ghost-Account sofort live/auffindbar sind (Produktvorgabe
      // "Quantität über Qualität", AGENTS.md 5) - NICHT verifiziert, das
      // passiert erst, wenn ein echter Veranstalter den Einladungscode einlöst.
      await ctx.db.insert(userProfile).values({
        userId: ghost.id,
        slug,
        isPublic: true,
        displayName,
      });

      return { userId: ghost.id, slug, displayName };
    }),

  // Anzeigename eines bestehenden Ghost-Accounts ändern (z.B. Tippfehler vor
  // Versand des Einladungscodes) - Slug wird wie bei `create` aus dem neuen
  // Anzeigenamen neu abgeleitet, wenn er sich geändert hat.
  update: adminProcedure
    .input(updateGhostAccountInputSchema)
    .mutation(async ({ ctx, input }) => {
      const displayName = sanitizeText(input.displayName);
      if (!displayName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Anzeigename darf nicht leer sein",
        });
      }

      const [ghost] = await ctx.db
        .select({
          isGhost: user.isGhost,
          mergedIntoUserId: userProfile.mergedIntoUserId,
          displayName: userProfile.displayName,
        })
        .from(user)
        .innerJoin(userProfile, eq(userProfile.userId, user.id))
        .where(eq(user.id, input.ghostUserId));

      if (!ghost?.isGhost) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Kein Ghost-Account",
        });
      }
      if (ghost.mergedIntoUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Dieser Ghost-Account wurde bereits übernommen",
        });
      }

      const slug =
        ghost.displayName === displayName
          ? undefined
          : await generateUniqueOrganizerSlug(
              ctx.db,
              displayName,
              input.ghostUserId,
            );

      await ctx.db
        .update(userProfile)
        .set({
          displayName,
          ...(slug ? { slug } : {}),
          updatedAt: new Date(),
        })
        .where(eq(userProfile.userId, input.ghostUserId));

      return { userId: input.ghostUserId, displayName, slug: slug ?? null };
    }),

  generateInviteCode: adminProcedure
    .input(generateGhostInviteCodeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [ghost] = await ctx.db
        .select({
          isGhost: user.isGhost,
          mergedIntoUserId: userProfile.mergedIntoUserId,
        })
        .from(user)
        .innerJoin(userProfile, eq(userProfile.userId, user.id))
        .where(eq(user.id, input.ghostUserId));

      if (!ghost?.isGhost) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Kein Ghost-Account",
        });
      }
      if (ghost.mergedIntoUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Dieser Ghost-Account wurde bereits übernommen",
        });
      }

      // Ein Ghost-Account hat höchstens einen aktiven (noch nicht
      // eingelösten) Code gleichzeitig - ein erneuter Aufruf ersetzt ihn
      // (Regenerieren, z.B. falls der ursprüngliche Code verloren ging).
      await ctx.db
        .delete(organizerInviteCode)
        .where(
          and(
            eq(organizerInviteCode.ghostUserId, input.ghostUserId),
            isNull(organizerInviteCode.usedByUserId),
          ),
        );

      const code = await generateUniqueInviteCode(ctx.db);
      await ctx.db.insert(organizerInviteCode).values({
        code,
        ghostUserId: input.ghostUserId,
        createdBy: ctx.user.id,
      });

      return { code };
    }),

  // Events eines Ghost-Accounts für /review/ghost-accounts/[userId] -
  // Grundlage, um sie von dort aus zu bearbeiten (events.update/getForEdit,
  // beide mit Moderator/Admin-Bypass, backend/src/routers/events.ts) oder zu
  // löschen (events.delete, hat diesen Bypass bereits).
  listEventsForGhost: adminProcedure
    .input(listGhostEventsInputSchema)
    .query(async ({ ctx, input }) => {
      const [ghost] = await ctx.db
        .select({
          isGhost: user.isGhost,
          displayName: userProfile.displayName,
          slug: userProfile.slug,
        })
        .from(user)
        .innerJoin(userProfile, eq(userProfile.userId, user.id))
        .where(eq(user.id, input.ghostUserId));

      if (!ghost?.isGhost) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Kein Ghost-Account",
        });
      }

      const events = await ctx.db
        .select({
          id: event.id,
          slug: event.slug,
          title: event.title,
          status: event.status,
          startDate: event.startDate,
          endDate: event.endDate,
          bundeslandName: bundeslandTable.name,
          kreisName: kreis.name,
          partyArtName: partyArt.name,
        })
        .from(event)
        .leftJoin(bundeslandTable, eq(event.bundeslandId, bundeslandTable.id))
        .leftJoin(kreis, eq(event.kreisId, kreis.id))
        .leftJoin(partyArt, eq(event.partyArtId, partyArt.id))
        .where(eq(event.organizerUserId, input.ghostUserId))
        .orderBy(desc(event.updatedAt));

      return {
        ghost: { displayName: ghost.displayName, slug: ghost.slug },
        events,
      };
    }),
});
