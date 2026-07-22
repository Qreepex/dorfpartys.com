import { and, count, countDistinct, eq, isNotNull, sql } from "drizzle-orm";
import {
  bundesland,
  event,
  kreis,
  partyArt,
  userProfile,
} from "../db/schema.js";
import { publicProcedure, router } from "../trpc/trpc.js";

/**
 * Zahlen für die Landingpage-Vertrauensleiste (AGENTS.md item 6/7) - bewusst
 * nur aggregierte, bereits öffentliche Größen, kein personenbezogener Bezug.
 */
export const statsRouter = router({
  overview: publicProcedure.query(async ({ ctx }) => {
    const [
      [{ total: approvedEvents }],
      [{ total: upcomingEvents }],
      [{ total: kreisCoverage }],
      [{ total: bundeslandCoverage }],
      [{ total: partyArten }],
      [{ total: organizers }],
    ] = await Promise.all([
      ctx.db
        .select({ total: count() })
        .from(event)
        .where(eq(event.status, "approved")),
      ctx.db
        .select({ total: count() })
        .from(event)
        .where(sql`${event.status} = 'approved' AND (${event.startDate} >= now() OR ${event.endDate} >= now())`),
      ctx.db
        .select({ total: countDistinct(event.kreisId) })
        .from(event)
        .where(eq(event.status, "approved")),
      ctx.db
        .select({ total: countDistinct(event.bundeslandId) })
        .from(event)
        .where(eq(event.status, "approved")),
      ctx.db
        .select({ total: count() })
        .from(partyArt)
        .where(eq(partyArt.active, true)),
      ctx.db
        .select({ total: count() })
        .from(userProfile)
        .where(
          and(isNotNull(userProfile.slug), eq(userProfile.isPublic, true)),
        ),
    ]);

    const [{ total: totalKreise }] = await ctx.db
      .select({ total: count() })
      .from(kreis);
    const [{ total: totalBundeslaender }] = await ctx.db
      .select({ total: count() })
      .from(bundesland);

    return {
      approvedEvents,
      upcomingEvents,
      kreisCoverage,
      bundeslandCoverage,
      partyArten,
      organizers,
      totalKreise,
      totalBundeslaender,
    };
  }),
});
