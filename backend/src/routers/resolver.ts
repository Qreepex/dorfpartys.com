import { eq } from "drizzle-orm";
import {
  MONTHS,
  buildCountryRootUrl,
  buildFilterUrl,
  resolverInputSchema,
} from "@dorfpartys/shared";
import { bundesland, kreis, partyArt } from "../db/schema.js";
import { createDrizzleTaxonomyRepository, resolve } from "../resolver/index.js";
import { buildBreadcrumbJsonLd } from "../seo/index.js";
import { publicProcedure, router } from "../trpc/trpc.js";
import type { Database } from "../db/index.js";

async function buildBreadcrumbsForResult(
  db: Database,
  country: Parameters<typeof buildCountryRootUrl>[0],
  filters: {
    bundeslandSlug: string | null;
    kreisSlug: string | null;
    artSlug: string | null;
    monatSlug: string | null;
  },
) {
  const items = [
    { name: country.toUpperCase(), url: buildCountryRootUrl(country) },
  ];

  if (filters.bundeslandSlug) {
    const [row] = await db
      .select({ name: bundesland.name })
      .from(bundesland)
      .where(eq(bundesland.slug, filters.bundeslandSlug));
    items.push({
      name: row?.name ?? filters.bundeslandSlug,
      url: buildFilterUrl(country, { bundeslandSlug: filters.bundeslandSlug }),
    });
  }

  if (filters.kreisSlug) {
    const [row] = await db
      .select({ name: kreis.name })
      .from(kreis)
      .where(eq(kreis.slug, filters.kreisSlug));
    items.push({
      name: row?.name ?? filters.kreisSlug,
      url: buildFilterUrl(country, {
        bundeslandSlug: filters.bundeslandSlug,
        kreisSlug: filters.kreisSlug,
      }),
    });
  }

  if (filters.artSlug) {
    const [row] = await db
      .select({ name: partyArt.name })
      .from(partyArt)
      .where(eq(partyArt.slug, filters.artSlug));
    items.push({
      name: row?.name ?? filters.artSlug,
      url: buildFilterUrl(country, {
        bundeslandSlug: filters.bundeslandSlug,
        kreisSlug: filters.kreisSlug,
        artSlug: filters.artSlug,
      }),
    });
  }

  if (filters.monatSlug) {
    const month = MONTHS.find((m) => m.slug === filters.monatSlug);
    items.push({
      name: month?.name ?? filters.monatSlug,
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

      const breadcrumbJsonLd = await buildBreadcrumbsForResult(
        ctx.db,
        input.country,
        outcome.filters,
      );
      return { ...outcome, breadcrumbJsonLd };
    }),
});
