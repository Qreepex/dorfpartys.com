import { and, asc, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { bundesland, event, user, userProfile } from "../db/schema.js";
import { isUpcomingOrDateless } from "../resolver/event-date-filters.js";
import { buildPublicStorageUrl } from "../storage/index.js";
import { publicProcedure, router } from "../trpc/trpc.js";
import { isOrganizerCurrentlyVerified } from "../verification/index.js";

// Anzahl Treffer pro Kategorie in der globalen Navbar-Suche - bewusst klein
// gehalten (Autocomplete-Dropdown, keine vollwertige Ergebnisliste wie eine
// Filter-Seite, AGENTS.md 1).
const RESULT_LIMIT = 6;

// Globale Freitextsuche für die Lupe in der Navbar - durchsucht Events
// (Titel, nur approved) und Veranstalter-Profile (Anzeigename, nur
// öffentlich/nicht übernommen) parallel, analog zu users.searchOrganizers.
export const searchRouter = router({
  global: publicProcedure
    .input(z.object({ query: z.string().trim().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const pattern = `%${input.query}%`;

      const [eventRows, organizerRows] = await Promise.all([
        ctx.db
          .select({
            slug: event.slug,
            title: event.title,
            startDate: event.startDate,
            endDate: event.endDate,
            country: bundesland.country,
            organizerName: event.organizerName,
            organizerUserId: event.organizerUserId,
            organizerConfirmed: event.organizerConfirmed,
            organizerDisplayName: userProfile.displayName,
            organizerProfileVerifiedAt: userProfile.verifiedAt,
          })
          .from(event)
          .innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
          .leftJoin(userProfile, eq(event.organizerUserId, userProfile.userId))
          .where(
            // Nur freigeschaltete Events (AGENTS.md 2: "Event erst nach
            // status = approved öffentlich sichtbar") - draft/in_review/
            // rejected tauchen in der öffentlichen Suche nie auf.
            and(eq(event.status, "approved"), ilike(event.title, pattern)),
          )
          // Sortierung: zuerst kommende/dateless Events (isUpcomingOrDateless,
          // siehe resolver/event-date-filters.ts), darunter aufsteigend nach
          // Startdatum - das am ehesten stattfindende zuerst. Dateless Events
          // (kein Termin bekannt) fallen ans Ende ihrer Gruppe (COALESCE auf
          // 'infinity'). Vergangene Events folgen danach, absteigend (jüngstes
          // zuerst) - analog zur upcoming/past-Aufteilung in saved-events.ts.
          // Der zweite/dritte Sortierschlüssel ist jeweils per CASE an seine
          // Gruppe gebunden (NULL in der anderen Gruppe), sonst würde der
          // aufsteigende Schlüssel die gewünschte absteigende Reihenfolge der
          // vergangenen Events überschreiben.
          .orderBy(
            asc(sql`(case when ${isUpcomingOrDateless} then 0 else 1 end)`),
            asc(
              sql`(case when ${isUpcomingOrDateless} then coalesce(${event.startDate}, 'infinity'::timestamptz) end)`,
            ),
            desc(
              sql`(case when not (${isUpcomingOrDateless}) then ${event.startDate} end)`,
            ),
          )
          .limit(RESULT_LIMIT),

        ctx.db
          .select({
            userId: userProfile.userId,
            slug: userProfile.slug,
            displayName: userProfile.displayName,
            avatarS3Key: userProfile.avatarS3Key,
            verifiedAt: userProfile.verifiedAt,
          })
          .from(userProfile)
          .innerJoin(user, eq(user.id, userProfile.userId))
          .where(
            and(
              eq(userProfile.isPublic, true),
              isNull(userProfile.mergedIntoUserId),
              ilike(userProfile.displayName, pattern),
            ),
          )
          .orderBy(desc(userProfile.verifiedAt))
          .limit(RESULT_LIMIT),
      ]);

      // Zweiter, schlanker Query nur für die gefundenen Veranstalter: Anzahl
      // + Länder ihrer freigeschalteten Events (für die "3 Veranstaltungen in
      // DE"-Anzeige in der Ergebnisliste), gruppiert statt N+1.
      const organizerIds = organizerRows.map((row) => row.userId);
      const statsByOrganizer = new Map<
        string,
        { count: number; countries: Set<string> }
      >();
      if (organizerIds.length > 0) {
        const statRows = await ctx.db
          .select({
            organizerUserId: event.organizerUserId,
            country: bundesland.country,
            count: sql<number>`count(*)`,
          })
          .from(event)
          .innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
          .where(
            and(
              eq(event.status, "approved"),
              inArray(event.organizerUserId, organizerIds),
            ),
          )
          .groupBy(event.organizerUserId, bundesland.country);

        for (const row of statRows) {
          if (!row.organizerUserId) continue;
          const entry = statsByOrganizer.get(row.organizerUserId) ?? {
            count: 0,
            countries: new Set<string>(),
          };
          entry.count += Number(row.count);
          entry.countries.add(row.country);
          statsByOrganizer.set(row.organizerUserId, entry);
        }
      }

      const events = eventRows
        .filter((row): row is typeof row & { slug: string } => !!row.slug)
        .map((row) => ({
          type: "event" as const,
          slug: row.slug,
          title: row.title,
          country: row.country,
          startDate: row.startDate ? row.startDate.toISOString() : null,
          endDate: row.endDate ? row.endDate.toISOString() : null,
          organizerName:
            row.organizerDisplayName ?? row.organizerName ?? "Veranstalter",
          organizerVerified: isOrganizerCurrentlyVerified({
            organizerUserId: row.organizerUserId,
            organizerConfirmed: row.organizerConfirmed,
            organizerProfileVerifiedAt: row.organizerProfileVerifiedAt,
          }),
        }));

      const organizers = organizerRows
        .filter((row): row is typeof row & { slug: string } => !!row.slug)
        .map((row) => {
          const stats = statsByOrganizer.get(row.userId);
          return {
            type: "organizer" as const,
            slug: row.slug,
            displayName: row.displayName ?? "Unbenannt",
            avatarUrl: row.avatarS3Key
              ? buildPublicStorageUrl(row.avatarS3Key)
              : null,
            verified: !!row.verifiedAt,
            eventCount: stats?.count ?? 0,
            countries: stats ? Array.from(stats.countries) : [],
          };
        });

      return { events, organizers };
    }),
});
