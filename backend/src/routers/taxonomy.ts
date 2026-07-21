import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { COUNTRIES } from "@dorfpartys/shared";
import { bundesland, event, kreis, partyArt } from "../db/schema.js";
import { hasOccurredWithin12MonthsOrDateless } from "../resolver/event-date-filters.js";
import { publicProcedure, router } from "../trpc/trpc.js";

export const taxonomyRouter = router({
  bundeslaender: publicProcedure
    .input(z.object({ country: z.enum(COUNTRIES) }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select({
          id: bundesland.id,
          slug: bundesland.slug,
          name: bundesland.name,
        })
        .from(bundesland)
        .where(eq(bundesland.country, input.country)),
    ),

  kreise: publicProcedure
    .input(z.object({ bundeslandId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select({ id: kreis.id, slug: kreis.slug, name: kreis.name })
        .from(kreis)
        .where(eq(kreis.bundeslandId, input.bundeslandId)),
    ),

  // "Beliebte Party-Arten" (Startseite) sollen tatsächlich nach Beliebtheit
  // sortiert sein statt nach (impliziter) Anlage-/DB-Reihenfolge - vorher
  // wurden hier einfach die ersten 8 zurückgegebenen Zeilen angezeigt, ohne
  // jeden Bezug zur echten Event-Anzahl. Zählbasis ist dieselbe wie für die
  // Indexierungsregeln (AGENTS.md 1.6): approved Events, die zukünftig,
  // dateless oder innerhalb der letzten 12 Monate archiviert sind - damit
  // stimmt "beliebt" mit dem überein, was Besucher:innen auf den jeweiligen
  // Filter-Seiten tatsächlich vorfinden. `country` ist optional, damit der
  // Aufruf ohne Land (Einreichungsformular-Dropdown) weiterhin funktioniert.
  partyArten: publicProcedure
    .input(z.object({ country: z.enum(COUNTRIES).optional() }).optional())
    .query(async ({ ctx, input }) =>
      ctx.db
        .select({
          id: partyArt.id,
          slug: partyArt.slug,
          name: partyArt.name,
          eventCount: sql<number>`count(${event.id})`,
        })
        .from(partyArt)
        .leftJoin(
          event,
          and(
            eq(event.partyArtId, partyArt.id),
            eq(event.status, "approved"),
            hasOccurredWithin12MonthsOrDateless,
            input?.country
              ? sql`exists (select 1 from ${bundesland} where ${bundesland.id} = ${event.bundeslandId} and ${bundesland.country} = ${input.country})`
              : undefined,
          ),
        )
        .where(eq(partyArt.active, true))
        .groupBy(partyArt.id, partyArt.slug, partyArt.name)
        .orderBy(desc(sql`count(${event.id})`), asc(partyArt.name)),
    ),
});
