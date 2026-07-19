import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { bundesland, event, kreis, partyArt, savedEvent } from "../db/schema.js";
import { protectedProcedure, router } from "../trpc/trpc.js";

/**
 * Gemerkte Veranstaltungen, angezeigt unter /partyliste. Eigener Router statt
 * Teil von `events`, da vollständig useraufgehängt (analog `users`).
 */
export const savedEventsRouter = router({
  save: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(savedEvent)
        .values({ userId: ctx.user.id, eventId: input.eventId })
        .onConflictDoNothing({ target: [savedEvent.userId, savedEvent.eventId] });
      return { saved: true };
    }),

  unsave: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(savedEvent)
        .where(
          and(eq(savedEvent.userId, ctx.user.id), eq(savedEvent.eventId, input.eventId)),
        );
      return { saved: false };
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        slug: event.slug,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        customColor: event.customColor,
        eventId: event.id,
        country: bundesland.country,
        bundeslandName: bundesland.name,
        kreisName: kreis.name,
        partyArtName: partyArt.name,
      })
      .from(savedEvent)
      .innerJoin(event, eq(savedEvent.eventId, event.id))
      .innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
      .innerJoin(kreis, eq(event.kreisId, kreis.id))
      .innerJoin(partyArt, eq(event.partyArtId, partyArt.id))
      .where(and(eq(savedEvent.userId, ctx.user.id), eq(event.status, "approved")));

    const now = Date.now();
    const upcoming = rows
      .filter((r) => new Date(r.endDate).getTime() >= now)
      .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));
    const past = rows
      .filter((r) => new Date(r.endDate).getTime() < now)
      .sort((a, b) => +new Date(b.startDate) - +new Date(a.startDate));

    return { upcoming, past };
  }),
});
