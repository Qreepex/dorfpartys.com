import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  bundesland,
  event,
  kreis,
  partyArt,
  savedEvent,
} from "../db/schema.js";
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
        .onConflictDoNothing({
          target: [savedEvent.userId, savedEvent.eventId],
        });
      return { saved: true };
    }),

  unsave: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(savedEvent)
        .where(
          and(
            eq(savedEvent.userId, ctx.user.id),
            eq(savedEvent.eventId, input.eventId),
          ),
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
      .where(
        and(eq(savedEvent.userId, ctx.user.id), eq(event.status, "approved")),
      );

    // Effektives Enddatum analog resolver/event-date-filters.ts: endDate falls
    // gesetzt, sonst startDate als Fallback. `null` (kein startDate, "dateless"
    // Event, AGENTS.md 5) zählt als "kommend", nie als "vergangen".
    function effectiveEndMs(r: (typeof rows)[number]): number | null {
      const fallback = r.endDate ?? r.startDate;
      return fallback ? new Date(fallback).getTime() : null;
    }
    // Dateless Events haben kein startDate zum Sortieren - hinten anstellen
    // (Infinity), statt bei Date(null) versehentlich auf 1970 zu landen.
    function startMs(
      r: (typeof rows)[number],
      fallbackForPast = false,
    ): number {
      if (r.startDate) return +new Date(r.startDate);
      return fallbackForPast ? 0 : Infinity;
    }

    const now = Date.now();
    const upcoming = rows
      .filter((r) => {
        const end = effectiveEndMs(r);
        return end === null || end >= now;
      })
      .sort((a, b) => startMs(a) - startMs(b));
    const past = rows
      .filter((r) => {
        const end = effectiveEndMs(r);
        return end !== null && end < now;
      })
      .sort((a, b) => startMs(b, true) - startMs(a, true));

    return { upcoming, past };
  }),
});
