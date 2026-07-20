import type { Country, EventListItem } from "@dorfpartys/shared";
import { and, count, eq, sql } from "drizzle-orm";
import type { Database } from "../db/index.js";
import {
  bundesland,
  event,
  eventPhoto,
  kreis,
  partyArt,
} from "../db/schema.js";
import type {
  EventFilterIds,
  NavigationItem,
  TaxonomyRepository,
} from "./types.js";

function whereConditions(country: Country, filters: EventFilterIds) {
  const conditions = [
    eq(bundesland.country, country),
    eq(event.status, "approved"),
    // "aktuelles/kommendes Event" (AGENTS.md 1.6): noch nicht vollständig vergangen.
    sql`${event.endDate} >= now()`,
  ];
  if (filters.bundeslandId)
    conditions.push(eq(event.bundeslandId, filters.bundeslandId));
  if (filters.kreisId) conditions.push(eq(event.kreisId, filters.kreisId));
  if (filters.partyArtId)
    conditions.push(eq(event.partyArtId, filters.partyArtId));
  return and(...conditions);
}

function whereConditionsPast12Months(
  country: Country,
  filters: EventFilterIds,
) {
  const conditions = [
    eq(bundesland.country, country),
    eq(event.status, "approved"),
    // Archiv: letzte 12 Monate (noch nicht älter als ein Jahr)
    sql`${event.endDate} >= now() - interval '12 months'`,
    // Aber nicht zukünftig (bereits vorbei)
    sql`${event.endDate} < now()`,
  ];
  if (filters.bundeslandId)
    conditions.push(eq(event.bundeslandId, filters.bundeslandId));
  if (filters.kreisId) conditions.push(eq(event.kreisId, filters.kreisId));
  if (filters.partyArtId)
    conditions.push(eq(event.partyArtId, filters.partyArtId));
  return and(...conditions);
}

export function createDrizzleTaxonomyRepository(
  db: Database,
): TaxonomyRepository {
  return {
    async findBundeslandBySlug(country, slug) {
      const [row] = await db
        .select({ id: bundesland.id, slug: bundesland.slug })
        .from(bundesland)
        .where(and(eq(bundesland.slug, slug), eq(bundesland.country, country)))
        .limit(1);
      return row;
    },

    async findKreisBySlug(country, slug) {
      const [row] = await db
        .select({
          id: kreis.id,
          slug: kreis.slug,
          bundeslandId: kreis.bundeslandId,
          bundeslandSlug: bundesland.slug,
        })
        .from(kreis)
        .innerJoin(bundesland, eq(kreis.bundeslandId, bundesland.id))
        .where(and(eq(kreis.slug, slug), eq(bundesland.country, country)))
        .limit(1);
      return row;
    },

    async findPartyArtBySlug(slug) {
      const [row] = await db
        .select({ id: partyArt.id, slug: partyArt.slug })
        .from(partyArt)
        .where(and(eq(partyArt.slug, slug), eq(partyArt.active, true)))
        .limit(1);
      return row;
    },

    async countApprovedEvents(country, filters) {
      const [row] = await db
        .select({ total: count() })
        .from(event)
        .innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
        .where(whereConditions(country, filters));
      return row?.total ?? 0;
    },

    async listApprovedEvents(
      country,
      filters,
      limit = 50,
    ): Promise<EventListItem[]> {
      const rows = await db
        .select({
          slug: event.slug,
          title: event.title,
          startDate: event.startDate,
          endDate: event.endDate,
          bundeslandId: event.bundeslandId,
          bundeslandName: bundesland.name,
          kreisId: event.kreisId,
          kreisName: kreis.name,
          partyArtId: event.partyArtId,
          partyArtName: partyArt.name,
          customColor: event.customColor,
          coverPhotoS3Key: eventPhoto.s3Key,
        })
        .from(event)
        .innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
        .innerJoin(kreis, eq(event.kreisId, kreis.id))
        .innerJoin(partyArt, eq(event.partyArtId, partyArt.id))
        .leftJoin(
          eventPhoto,
          and(eq(eventPhoto.eventId, event.id), eq(eventPhoto.position, 1)),
        )
        .where(whereConditions(country, filters))
        .orderBy(event.startDate)
        .limit(limit);

      return rows.map((row) => ({
        slug: row.slug,
        title: row.title,
        startDate: row.startDate.toISOString(),
        endDate: row.endDate.toISOString(),
        bundeslandId: row.bundeslandId,
        bundeslandName: row.bundeslandName,
        kreisId: row.kreisId,
        kreisName: row.kreisName,
        partyArtId: row.partyArtId,
        partyArtName: row.partyArtName,
        customColor: row.customColor,
        coverPhotoS3Key: row.coverPhotoS3Key,
      }));
    },

    async listApprovedEventsPast12Months(
      country,
      filters,
      limit = 25,
    ): Promise<EventListItem[]> {
      const rows = await db
        .select({
          slug: event.slug,
          title: event.title,
          startDate: event.startDate,
          endDate: event.endDate,
          bundeslandId: event.bundeslandId,
          bundeslandName: bundesland.name,
          kreisId: event.kreisId,
          kreisName: kreis.name,
          partyArtId: event.partyArtId,
          partyArtName: partyArt.name,
          customColor: event.customColor,
          coverPhotoS3Key: eventPhoto.s3Key,
        })
        .from(event)
        .innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
        .innerJoin(kreis, eq(event.kreisId, kreis.id))
        .innerJoin(partyArt, eq(event.partyArtId, partyArt.id))
        .leftJoin(
          eventPhoto,
          and(eq(eventPhoto.eventId, event.id), eq(eventPhoto.position, 1)),
        )
        .where(whereConditionsPast12Months(country, filters))
        .orderBy(event.startDate)
        .limit(limit);

      return rows.map((row) => ({
        slug: row.slug,
        title: row.title,
        startDate: row.startDate.toISOString(),
        endDate: row.endDate.toISOString(),
        bundeslandId: row.bundeslandId,
        bundeslandName: row.bundeslandName,
        kreisId: row.kreisId,
        kreisName: row.kreisName,
        partyArtId: row.partyArtId,
        partyArtName: row.partyArtName,
        customColor: row.customColor,
        coverPhotoS3Key: row.coverPhotoS3Key,
      }));
    },

    async listKreiseForBundesland(
      country: Country,
      bundeslandId: string,
      filters?: EventFilterIds,
    ): Promise<NavigationItem[]> {
      // Lade die Kreise dieses Bundeslands
      const kreiseList = await db
        .select({
          id: kreis.id,
          slug: kreis.slug,
          name: kreis.name,
        })
        .from(kreis)
        .where(eq(kreis.bundeslandId, bundeslandId));

      // Für jeden Kreis, zähle die Events DIREKT IN DIESEM KREIS, BUNDESLAND UND LAND
      const result: NavigationItem[] = [];

      for (const kreis_item of kreiseList) {
        const [countResult] = await db
          .select({
            eventCount: count(event.id),
          })
          .from(event)
          .innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
          .where(
            and(
              eq(bundesland.country, country),
              eq(event.status, "approved"),
              eq(event.bundeslandId, bundeslandId),
              eq(event.kreisId, kreis_item.id),
              // future + 12-Monats-Archiv (deckungsgleich mit resolve.ts hasAnyEvents)
              sql`${event.endDate} >= now() - interval '12 months'`,
              filters?.partyArtId
                ? eq(event.partyArtId, filters.partyArtId)
                : undefined,
            ),
          );

        result.push({
          slug: kreis_item.slug,
          name: kreis_item.name,
          eventCount: countResult?.eventCount ?? 0,
        });
      }

      return result;
    },

    async listPartyArtenForLocation(
      country: Country,
      filters: EventFilterIds,
    ): Promise<NavigationItem[]> {
      // Lade alle aktiven Party-Arten
      const arten = await db
        .select({
          id: partyArt.id,
          slug: partyArt.slug,
          name: partyArt.name,
        })
        .from(partyArt)
        .where(eq(partyArt.active, true));

      // Für jede Art, zähle Events mit den angegebenen Filtern und Land
      const result: NavigationItem[] = [];

      for (const art of arten) {
        const [countResult] = await db
          .select({
            eventCount: count(event.id),
          })
          .from(event)
          .innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
          .where(
            and(
              eq(bundesland.country, country),
              eq(event.status, "approved"),
              eq(event.partyArtId, art.id),
              // future + 12-Monats-Archiv (deckungsgleich mit resolve.ts hasAnyEvents)
              sql`${event.endDate} >= now() - interval '12 months'`,
              filters.bundeslandId
                ? eq(event.bundeslandId, filters.bundeslandId)
                : undefined,
              filters.kreisId ? eq(event.kreisId, filters.kreisId) : undefined,
            ),
          );

        result.push({
          slug: art.slug,
          name: art.name,
          eventCount: countResult?.eventCount ?? 0,
        });
      }

      return result;
    },
  };
}
