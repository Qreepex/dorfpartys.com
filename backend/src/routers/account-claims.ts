import { TRPCError } from "@trpc/server";
import { and, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { accountClaim, event, user, userProfile } from "../db/schema.js";
import { createNotification } from "../notifications/index.js";
import {
  moderatorProcedure,
  protectedProcedure,
  router,
} from "../trpc/trpc.js";

// Übernahme eines Ghost-Accounts (nicht registrierter Veranstalter, AGENTS.md
// 5/5.4) durch einen verifizierten, echten Veranstalter über die
// Veranstalter-Seite ("Gehört das Profil zu dir?"). Getrennt von
// event-claims.ts, das einzelne Events claimt statt eines ganzen Profils.
export const accountClaimsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        ghostUserId: z.string().uuid(),
        reason: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [ownProfile] = await ctx.db
        .select({ verifiedAt: userProfile.verifiedAt })
        .from(userProfile)
        .where(eq(userProfile.userId, ctx.user.id));
      if (!ownProfile?.verifiedAt) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Bitte verifiziere zuerst deinen eigenen Account",
        });
      }

      const [ghost] = await ctx.db
        .select({ isGhost: user.isGhost })
        .from(user)
        .where(eq(user.id, input.ghostUserId));
      if (!ghost?.isGhost) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Dieses Profil kann nicht beansprucht werden",
        });
      }

      const [pending] = await ctx.db
        .select({ id: accountClaim.id })
        .from(accountClaim)
        .where(
          and(
            eq(accountClaim.ghostUserId, input.ghostUserId),
            eq(accountClaim.claimedByUserId, ctx.user.id),
            eq(accountClaim.status, "pending"),
          ),
        );
      if (pending) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Du hast dieses Profil bereits angefragt",
        });
      }

      const [row] = await ctx.db
        .insert(accountClaim)
        .values({
          ghostUserId: input.ghostUserId,
          claimedByUserId: ctx.user.id,
          reason: input.reason ?? null,
        })
        .returning({ id: accountClaim.id });

      return { id: row.id };
    }),

  myClaimStatus: protectedProcedure
    .input(z.object({ ghostUserId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ status: accountClaim.status })
        .from(accountClaim)
        .where(
          and(
            eq(accountClaim.ghostUserId, input.ghostUserId),
            eq(accountClaim.claimedByUserId, ctx.user.id),
          ),
        )
        .orderBy(accountClaim.requestedAt)
        .limit(1);
      return { status: row?.status ?? null };
    }),

  listPending: moderatorProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: accountClaim.id,
        reason: accountClaim.reason,
        requestedAt: accountClaim.requestedAt,
        ghostUserId: user.id,
        ghostDisplayName: userProfile.displayName,
        ghostSlug: userProfile.slug,
        claimedByUserId: accountClaim.claimedByUserId,
      })
      .from(accountClaim)
      .innerJoin(user, eq(accountClaim.ghostUserId, user.id))
      .leftJoin(userProfile, eq(userProfile.userId, user.id))
      .where(eq(accountClaim.status, "pending"))
      .orderBy(accountClaim.requestedAt);

    const ghostIds = [...new Set(rows.map((r) => r.ghostUserId))];
    const claimerIds = [...new Set(rows.map((r) => r.claimedByUserId))];

    const [eventCounts, claimerProfiles] = await Promise.all([
      ghostIds.length
        ? ctx.db
            .select({ organizerUserId: event.organizerUserId, total: count() })
            .from(event)
            .where(inArray(event.organizerUserId, ghostIds))
            .groupBy(event.organizerUserId)
        : Promise.resolve([]),
      claimerIds.length
        ? ctx.db
            .select({
              userId: userProfile.userId,
              displayName: userProfile.displayName,
              slug: userProfile.slug,
            })
            .from(userProfile)
            .where(inArray(userProfile.userId, claimerIds))
        : Promise.resolve([]),
    ]);
    const eventCountByGhost = new Map(
      eventCounts.map((r) => [r.organizerUserId, r.total]),
    );
    const claimerById = new Map(claimerProfiles.map((p) => [p.userId, p]));

    return rows.map((row) => ({
      ...row,
      ghostEventCount: eventCountByGhost.get(row.ghostUserId) ?? 0,
      claimedByDisplayName:
        claimerById.get(row.claimedByUserId)?.displayName ?? null,
      claimedBySlug: claimerById.get(row.claimedByUserId)?.slug ?? null,
    }));
  }),

  approve: moderatorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [claim] = await ctx.db
        .select()
        .from(accountClaim)
        .where(eq(accountClaim.id, input.id));
      if (!claim) throw new TRPCError({ code: "NOT_FOUND" });
      if (claim.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Anfrage ist bereits ${claim.status}`,
        });
      }

      const [claimerProfile] = await ctx.db
        .select({ verifiedAt: userProfile.verifiedAt })
        .from(userProfile)
        .where(eq(userProfile.userId, claim.claimedByUserId));

      await ctx.db
        .update(accountClaim)
        .set({
          status: "approved",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(accountClaim.id, input.id));

      // Andere ausstehende Anfragen für denselben Ghost sind hinfällig.
      await ctx.db
        .update(accountClaim)
        .set({
          status: "rejected",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        })
        .where(
          and(
            eq(accountClaim.ghostUserId, claim.ghostUserId),
            eq(accountClaim.status, "pending"),
          ),
        );

      // Alle Events des Ghost-Accounts komplett auf den übernehmenden Account
      // umhängen (auch `createdBy`, nicht nur `organizerUserId` - gleiche
      // Begründung wie in invite-codes/index.ts redeemInviteCode(): sonst
      // behielte die ursprünglich einreichende Person über die Eigentums-
      // Prüfung in `update`/`delete`/`getForEdit` dauerhaft Bearbeitungsrechte).
      await ctx.db
        .update(event)
        .set({
          createdBy: claim.claimedByUserId,
          organizerUserId: claim.claimedByUserId,
          organizerVerified: !!claimerProfile?.verifiedAt,
          organizerConfirmed: true,
          updatedAt: new Date(),
        })
        .where(eq(event.organizerUserId, claim.ghostUserId));

      // Ghost-Profil bleibt als dauerhafter Redirect-Stub erhalten (SEO-
      // Werterhalt alter /veranstalter/{slug}/-Links).
      await ctx.db
        .update(userProfile)
        .set({ mergedIntoUserId: claim.claimedByUserId, updatedAt: new Date() })
        .where(eq(userProfile.userId, claim.ghostUserId));

      const [ghostProfile] = await ctx.db
        .select({ displayName: userProfile.displayName })
        .from(userProfile)
        .where(eq(userProfile.userId, claim.ghostUserId));
      await createNotification(ctx.db, {
        userId: claim.claimedByUserId,
        type: "account_claim_approved",
        message: `Deine Anfrage, das Profil "${ghostProfile?.displayName ?? "Veranstalter"}" zu übernehmen, wurde angenommen.`,
        link: "/profil",
      });

      return { id: input.id, status: "approved" as const };
    }),

  reject: moderatorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [claim] = await ctx.db
        .select({
          status: accountClaim.status,
          claimedByUserId: accountClaim.claimedByUserId,
          ghostUserId: accountClaim.ghostUserId,
        })
        .from(accountClaim)
        .where(eq(accountClaim.id, input.id));
      if (!claim) throw new TRPCError({ code: "NOT_FOUND" });
      if (claim.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Anfrage ist bereits ${claim.status}`,
        });
      }

      await ctx.db
        .update(accountClaim)
        .set({
          status: "rejected",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(accountClaim.id, input.id));

      const [ghostProfile] = await ctx.db
        .select({ displayName: userProfile.displayName })
        .from(userProfile)
        .where(eq(userProfile.userId, claim.ghostUserId));
      await createNotification(ctx.db, {
        userId: claim.claimedByUserId,
        type: "account_claim_rejected",
        message: `Deine Anfrage, das Profil "${ghostProfile?.displayName ?? "Veranstalter"}" zu übernehmen, wurde abgelehnt.`,
        link: "/profil",
      });

      return { id: input.id, status: "rejected" as const };
    }),
});
