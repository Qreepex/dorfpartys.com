import { and, count, eq, sql } from "drizzle-orm";
import type { Country, EventListItem } from "@dorfpartys/shared";
import type { Database } from "../db/index.js";
import {
  bundesland,
  event,
  eventPhoto,
  kreis,
  partyArt,
} from "../db/schema.js";
import type { EventFilterIds, TaxonomyRepository } from "./types.js";

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
  if (filters.monatNumber) {
    conditions.push(
      sql`extract(month from ${event.startDate}) = ${filters.monatNumber}`,
    );
  }
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
          kreisId: event.kreisId,
          partyArtId: event.partyArtId,
          customColor: event.customColor,
          coverPhotoS3Key: eventPhoto.s3Key,
        })
        .from(event)
        .innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
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
        kreisId: row.kreisId,
        partyArtId: row.partyArtId,
        customColor: row.customColor,
        coverPhotoS3Key: row.coverPhotoS3Key,
      }));
    },
  };
}
