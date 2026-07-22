import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import {
  buildCountryRootUrl,
  buildFilterUrl,
  resolverInputSchema,
  resolverLoadMoreInputSchema,
  type Country,
  type ResolvedFilterNames,
} from "@dorfpartys/shared";
import { bundesland, kreis, partyArt } from "../db/schema.js";
import {
  classifySegments,
  createDrizzleTaxonomyRepository,
  filterIdsFromClassified,
  resolve,
} from "../resolver/index.js";
import { buildBreadcrumbJsonLd, buildSearchSeoCopy } from "../seo/index.js";
import { publicProcedure, router } from "../trpc/trpc.js";
import type { Database } from "../db/index.js";

// Feste Seitengröße für "Mehr laden" - deckungsgleich mit dem Default-Limit
// von `listApprovedEvents` (backend/src/resolver/drizzle-repository.ts), damit
// Offsets zwischen initialem Load und Nachlade-Seiten konsistent bleiben.
const LOAD_MORE_PAGE_SIZE = 50;

const COUNTRY_LABELS: Record<Country, string> = {
  de: "Deutschland",
  at: "Österreich",
  ch: "Schweiz",
};

async function resolveNamesForFilters(
  db: Database,
  country: Country,
  filters: {
    bundeslandSlug: string | null;
    kreisSlug: string | null;
    artSlug: string | null;
  },
): Promise<ResolvedFilterNames> {
  const [bundeslandRow] = filters.bundeslandSlug
    ? await db
        .select({ name: bundesland.name })
        .from(bundesland)
        .where(eq(bundesland.slug, filters.bundeslandSlug))
    : [undefined];
  const [kreisRow] = filters.kreisSlug
    ? await db
        .select({ name: kreis.name })
        .from(kreis)
        .where(eq(kreis.slug, filters.kreisSlug))
    : [undefined];
  const [artRow] = filters.artSlug
    ? await db
        .select({ name: partyArt.name })
        .from(partyArt)
        .where(eq(partyArt.slug, filters.artSlug))
    : [undefined];

  return {
    country,
    bundeslandName: bundeslandRow?.name ?? filters.bundeslandSlug,
    kreisName: kreisRow?.name ?? filters.kreisSlug,
    artName: artRow?.name ?? filters.artSlug,
  };
}

async function buildNavigationTree(
  db: Database,
  country: Country,
  filters: {
    bundeslandSlug: string | null;
    kreisSlug: string | null;
    artSlug: string | null;
  },
) {
  const repo = createDrizzleTaxonomyRepository(db);
  const navigationTree: Record<string, unknown> = {};

  // If at country root, show available Bundesländer (filtered by current artSlug if present)
  if (!filters.bundeslandSlug && !filters.kreisSlug) {
    const filterIds = filters.artSlug
      ? { partyArtId: (await repo.findPartyArtBySlug(filters.artSlug))?.id }
      : undefined;
    navigationTree.bundeslaender = await repo.listBundeslaenderForCountry(
      country,
      filterIds,
    );
  }

  // If at Bundesland level, show available Kreise (filtered by current artSlug if present)
  if (filters.bundeslandSlug && !filters.kreisSlug) {
    const bundesland = await repo.findBundeslandBySlug(
      country,
      filters.bundeslandSlug,
    );
    if (bundesland) {
      const filterIds = filters.artSlug
        ? { partyArtId: (await repo.findPartyArtBySlug(filters.artSlug))?.id }
        : undefined;
      navigationTree.kreise = await repo.listKreiseForBundesland(
        country,
        bundesland.id,
        filterIds,
      );
    }
  }

  // Show available Party-Arten at any level (filtered by current bundesland/kreis, incl. country root)
  {
    let bundeslandId: string | undefined;
    let kreisId: string | undefined;

    if (filters.bundeslandSlug) {
      bundeslandId = (
        await repo.findBundeslandBySlug(country, filters.bundeslandSlug)
      )?.id;
    }
    if (filters.kreisSlug) {
      kreisId = (await repo.findKreisBySlug(country, filters.kreisSlug))?.id;
    }

    const filterIds = {
      bundeslandId,
      kreisId,
    };
    navigationTree.partyArten = await repo.listPartyArtenForLocation(
      country,
      filterIds,
    );
  }

  return Object.keys(navigationTree).length > 0 ? navigationTree : undefined;
}

function buildBreadcrumbsForResult(
  country: Country,
  filters: {
    bundeslandSlug: string | null;
    kreisSlug: string | null;
    artSlug: string | null;
  },
  names: ResolvedFilterNames,
) {
  const items = [
    { name: COUNTRY_LABELS[country], url: buildCountryRootUrl(country) },
  ];

  if (filters.bundeslandSlug) {
    items.push({
      name: names.bundeslandName ?? filters.bundeslandSlug,
      url: buildFilterUrl(country, { bundeslandSlug: filters.bundeslandSlug }),
    });
  }
  if (filters.kreisSlug) {
    items.push({
      name: names.kreisName ?? filters.kreisSlug,
      url: buildFilterUrl(country, {
        bundeslandSlug: filters.bundeslandSlug,
        kreisSlug: filters.kreisSlug,
      }),
    });
  }
  if (filters.artSlug) {
    items.push({
      name: names.artName ?? filters.artSlug,
      url: buildFilterUrl(country, {
        bundeslandSlug: filters.bundeslandSlug,
        kreisSlug: filters.kreisSlug,
        artSlug: filters.artSlug,
      }),
    });
  }

  return buildBreadcrumbJsonLd(items);
}

export const resolverRouter = router({
  resolve: publicProcedure
    .input(resolverInputSchema)
    .query(async ({ ctx, input }) => {
      const repo = createDrizzleTaxonomyRepository(ctx.db);
      const outcome = await resolve(input.country, input.segments, repo);

      if (outcome.kind !== "result") {
        return outcome;
      }

      const names = await resolveNamesForFilters(
        ctx.db,
        input.country,
        outcome.filters,
      );
      const seo = buildSearchSeoCopy({
        country: input.country,
        bundeslandSlug: outcome.filters.bundeslandSlug,
        bundeslandName: names.bundeslandName,
        kreisName: names.kreisName,
        artName: names.artName,
        artSlug: outcome.filters.artSlug,
        total: outcome.total,
      });
      const breadcrumbJsonLd = buildBreadcrumbsForResult(
        input.country,
        outcome.filters,
        names,
      );

      // Build navigation tree based on current filter level
      const navigationTree = await buildNavigationTree(
        ctx.db,
        input.country,
        outcome.filters,
      );

      return { ...outcome, names, seo, breadcrumbJsonLd, navigationTree };
    }),

  // "Mehr laden" auf Filter-/Suchseiten (nur zukünftige Events, siehe
  // AGENTS.md 1.6/Sidebar-Todo) - dieselben Segmente wie `resolve`, aber ohne
  // die Namen/SEO/Navigation-Anreicherung, da nur die nächste Event-Seite
  // gebraucht wird.
  loadMoreEvents: publicProcedure
    .input(resolverLoadMoreInputSchema)
    .query(async ({ ctx, input }) => {
      const repo = createDrizzleTaxonomyRepository(ctx.db);
      const classifyResult = await classifySegments(
        input.country,
        input.segments,
        repo,
      );
      if (!classifyResult.ok) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const filterIds = filterIdsFromClassified(classifyResult.classified);
      const results = await repo.listApprovedEvents(
        input.country,
        filterIds,
        LOAD_MORE_PAGE_SIZE,
        input.offset,
      );

      return { results };
    }),
});
