import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { event, organizerNomination, user, userProfile } from "../db/schema.js";
import {
  moderatorProcedure,
  protectedProcedure,
  router,
} from "../trpc/trpc.js";

// Bestätigungs-Workflow für die Nominierung eines bestehenden, fremden
// Profils als Veranstalter (AGENTS.md 5.3): der Inhaber des nominierten
// Profils oder ein Moderator/Admin muss zustimmen, bevor das Event als von
// diesem Veranstalter angezeigt wird (event.organizerConfirmed).
export const organizerNominationsRouter = router({
  confirm: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [nomination] = await ctx.db
        .select()
        .from(organizerNomination)
        .where(eq(organizerNomination.id, input.id));
      if (!nomination) throw new TRPCError({ code: "NOT_FOUND" });
      if (nomination.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Anfrage ist bereits ${nomination.status}`,
        });
      }
      const isModerator =
        ctx.user.role === "moderator" || ctx.user.role === "admin";
      if (nomination.nominatedUserId !== ctx.user.id && !isModerator) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [profile] = await ctx.db
        .select({ verifiedAt: userProfile.verifiedAt })
        .from(userProfile)
        .where(eq(userProfile.userId, nomination.nominatedUserId));

      await ctx.db
        .update(organizerNomination)
        .set({
          status: "approved",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(organizerNomination.id, input.id));

      await ctx.db
        .update(event)
        .set({
          organizerConfirmed: true,
          organizerVerified: !!profile?.verifiedAt,
          updatedAt: new Date(),
        })
        .where(eq(event.id, nomination.eventId));

      return { id: input.id, status: "approved" as const };
    }),

  reject: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [nomination] = await ctx.db
        .select()
        .from(organizerNomination)
        .where(eq(organizerNomination.id, input.id));
      if (!nomination) throw new TRPCError({ code: "NOT_FOUND" });
      if (nomination.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Anfrage ist bereits ${nomination.status}`,
        });
      }
      const isModerator =
        ctx.user.role === "moderator" || ctx.user.role === "admin";
      if (nomination.nominatedUserId !== ctx.user.id && !isModerator) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await ctx.db
        .update(organizerNomination)
        .set({
          status: "rejected",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(organizerNomination.id, input.id));

      // Event fällt auf den ursprünglichen Namen als Freitext zurück, statt
      // ohne Veranstalter dazustehen (AGENTS.md-Rückfrage).
      await ctx.db
        .update(event)
        .set({
          organizerUserId: null,
          organizerName: nomination.nominatedDisplayNameSnapshot,
          organizerVerified: false,
          organizerConfirmed: true,
          updatedAt: new Date(),
        })
        .where(eq(event.id, nomination.eventId));

      return { id: input.id, status: "rejected" as const };
    }),

  listPending: moderatorProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: organizerNomination.id,
        requestedAt: organizerNomination.requestedAt,
        eventId: event.id,
        eventTitle: event.title,
        eventSlug: event.slug,
        nominatedUserId: user.id,
        nominatedDisplayName: userProfile.displayName,
        nominatedSlug: userProfile.slug,
      })
      .from(organizerNomination)
      .innerJoin(event, eq(organizerNomination.eventId, event.id))
      .innerJoin(user, eq(organizerNomination.nominatedUserId, user.id))
      .leftJoin(userProfile, eq(userProfile.userId, user.id))
      .where(eq(organizerNomination.status, "pending"))
      .orderBy(organizerNomination.requestedAt);

    return rows;
  }),
});
