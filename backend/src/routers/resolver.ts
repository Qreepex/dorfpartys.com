import { eq } from "drizzle-orm";
import {
  MONTHS,
  buildCountryRootUrl,
  buildFilterUrl,
  resolverInputSchema,
  type Country,
  type ResolvedFilterNames,
} from "@dorfpartys/shared";
import { bundesland, kreis, partyArt } from "../db/schema.js";
import { createDrizzleTaxonomyRepository, resolve } from "../resolver/index.js";
import { buildBreadcrumbJsonLd, buildSearchSeoCopy } from "../seo/index.js";
import { publicProcedure, router } from "../trpc/trpc.js";
import type { Database } from "../db/index.js";

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
    monatSlug: string | null;
  },
): Promise<ResolvedFilterNames> {
  const [bundeslandRow] = filters.bundeslandSlug
    ? await db
        .select({ name: bundesland.name })
        .from(bundesland)
        .where(eq(bundesland.slug, filters.bundeslandSlug))
    : [undefined];
  const [kreisRow] = filters.kreisSlug
    ? await db.select({ name: kreis.name }).from(kreis).where(eq(kreis.slug, filters.kreisSlug))
    : [undefined];
  const [artRow] = filters.artSlug
    ? await db
        .select({ name: partyArt.name })
        .from(partyArt)
        .where(eq(partyArt.slug, filters.artSlug))
    : [undefined];
  const monat = filters.monatSlug
    ? (MONTHS.find((m) => m.slug === filters.monatSlug)?.name ?? filters.monatSlug)
    : null;

  return {
    country,
    bundeslandName: bundeslandRow?.name ?? filters.bundeslandSlug,
    kreisName: kreisRow?.name ?? filters.kreisSlug,
    artName: artRow?.name ?? filters.artSlug,
    monatName: monat,
  };
}

function buildBreadcrumbsForResult(
  country: Country,
  filters: {
    bundeslandSlug: string | null;
    kreisSlug: string | null;
    artSlug: string | null;
    monatSlug: string | null;
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
  if (filters.monatSlug) {
    items.push({
      name: names.monatName ?? filters.monatSlug,
      url: buildFilterUrl(country, {
        bundeslandSlug: filters.bundeslandSlug,
        kreisSlug: filters.kreisSlug,
        artSlug: filters.artSlug,
        monatSlug: filters.monatSlug,
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

      const names = await resolveNamesForFilters(ctx.db, input.country, outcome.filters);
      const seo = buildSearchSeoCopy({
        country: input.country,
        bundeslandName: names.bundeslandName,
        kreisName: names.kreisName,
        artName: names.artName,
        monatName: names.monatName,
        total: outcome.total,
      });
      const breadcrumbJsonLd = buildBreadcrumbsForResult(
        input.country,
        outcome.filters,
        names,
      );
      return { ...outcome, names, seo, breadcrumbJsonLd };
    }),
});
