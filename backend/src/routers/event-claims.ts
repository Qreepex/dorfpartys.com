import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { event, eventClaim, user, userProfile } from "../db/schema.js";
import {
  moderatorProcedure,
  protectedProcedure,
  router,
} from "../trpc/trpc.js";

// Claim-Workflow für nicht-verifizierte Veranstalter (AGENTS.md 5.4): ein
// verifizierter Veranstalter kann ein Event, das ihm nicht zugeordnet ist,
// "claimen" - Moderation entscheidet über die Übernahme.
export const eventClaimsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        reason: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [profile] = await ctx.db
        .select({ verifiedAt: userProfile.verifiedAt })
        .from(userProfile)
        .where(eq(userProfile.userId, ctx.user.id));
      if (!profile?.verifiedAt) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Nur verifizierte Veranstalter können Events claimen",
        });
      }

      const [existing] = await ctx.db
        .select({
          id: event.id,
          organizerUserId: event.organizerUserId,
          organizerVerified: event.organizerVerified,
        })
        .from(event)
        .where(eq(event.id, input.eventId));
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (existing.organizerVerified) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Dieses Event hat bereits einen verifizierten Veranstalter",
        });
      }
      if (existing.organizerUserId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Du bist bereits als Veranstalter hinterlegt",
        });
      }

      const [pending] = await ctx.db
        .select({ id: eventClaim.id })
        .from(eventClaim)
        .where(
          and(
            eq(eventClaim.eventId, input.eventId),
            eq(eventClaim.claimedByUserId, ctx.user.id),
            eq(eventClaim.status, "pending"),
          ),
        );
      if (pending) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Du hast dieses Event bereits angefragt",
        });
      }

      const [row] = await ctx.db
        .insert(eventClaim)
        .values({
          eventId: input.eventId,
          claimedByUserId: ctx.user.id,
          reason: input.reason ?? null,
        })
        .returning({ id: eventClaim.id });

      return { id: row.id };
    }),

  // Status der eigenen (letzten) Claim-Anfrage für ein Event - blendet den
  // Claim-Button auf der Event-Seite aus, solange eine Anfrage aussteht.
  myClaimStatus: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ status: eventClaim.status })
        .from(eventClaim)
        .where(
          and(
            eq(eventClaim.eventId, input.eventId),
            eq(eventClaim.claimedByUserId, ctx.user.id),
          ),
        )
        .orderBy(eventClaim.requestedAt)
        .limit(1);
      return { status: row?.status ?? null };
    }),

  listPending: moderatorProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: eventClaim.id,
        reason: eventClaim.reason,
        requestedAt: eventClaim.requestedAt,
        eventId: event.id,
        eventTitle: event.title,
        eventSlug: event.slug,
        claimedByUserId: user.id,
        claimedByDisplayName: userProfile.displayName,
        claimedBySlug: userProfile.slug,
        claimedByEmail: user.email,
      })
      .from(eventClaim)
      .innerJoin(event, eq(eventClaim.eventId, event.id))
      .innerJoin(user, eq(eventClaim.claimedByUserId, user.id))
      .leftJoin(userProfile, eq(userProfile.userId, user.id))
      .where(eq(eventClaim.status, "pending"))
      .orderBy(eventClaim.requestedAt);

    return rows;
  }),

  approve: moderatorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [claim] = await ctx.db
        .select()
        .from(eventClaim)
        .where(eq(eventClaim.id, input.id));
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
        .update(eventClaim)
        .set({
          status: "approved",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(eventClaim.id, input.id));

      // Andere ausstehende Anfragen für dasselbe Event sind hinfällig, sobald
      // ein Veranstalter zugewiesen wurde.
      await ctx.db
        .update(eventClaim)
        .set({
          status: "rejected",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        })
        .where(
          and(
            eq(eventClaim.eventId, claim.eventId),
            eq(eventClaim.status, "pending"),
          ),
        );

      await ctx.db
        .update(event)
        .set({
          organizerUserId: claim.claimedByUserId,
          organizerName: null,
          organizerVerified: !!claimerProfile?.verifiedAt,
          organizerConfirmed: true,
          updatedAt: new Date(),
        })
        .where(eq(event.id, claim.eventId));

      return { id: input.id, status: "approved" as const };
    }),

  reject: moderatorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [claim] = await ctx.db
        .select({ status: eventClaim.status })
        .from(eventClaim)
        .where(eq(eventClaim.id, input.id));
      if (!claim) throw new TRPCError({ code: "NOT_FOUND" });
      if (claim.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Anfrage ist bereits ${claim.status}`,
        });
      }

      await ctx.db
        .update(eventClaim)
        .set({
          status: "rejected",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(eventClaim.id, input.id));

      return { id: input.id, status: "rejected" as const };
    }),
});
