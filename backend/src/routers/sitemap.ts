import { z } from "zod";
import { COUNTRIES } from "@dorfpartys/shared";
import {
  getArtenSitemapEntries,
  getEventSitemapEntries,
  getFilterCombinationsLevel2SitemapEntries,
  getFilterCombinationsLevel3SitemapEntries,
  getBundeslandSlugsForSitemapIndex,
  getOrteSitemapEntries,
  getVeranstalterSitemapEntries,
} from "../seo/index.js";
import { publicProcedure, router } from "../trpc/trpc.js";

export const sitemapRouter = router({
  events: publicProcedure.query(({ ctx }) => getEventSitemapEntries(ctx.db)),

  orte: publicProcedure
    .input(z.object({ country: z.enum(COUNTRIES) }))
    .query(({ ctx, input }) => getOrteSitemapEntries(ctx.db, input.country)),

  arten: publicProcedure
    .input(z.object({ country: z.enum(COUNTRIES) }))
    .query(({ ctx, input }) => getArtenSitemapEntries(ctx.db, input.country)),

  filterCombinationsLevel2: publicProcedure
    .input(z.object({ country: z.enum(COUNTRIES) }))
    .query(({ ctx, input }) =>
      getFilterCombinationsLevel2SitemapEntries(ctx.db, input.country),
    ),

  filterCombinationsLevel3: publicProcedure
    .input(z.object({ country: z.enum(COUNTRIES), bundeslandSlug: z.string() }))
    .query(({ ctx, input }) =>
      getFilterCombinationsLevel3SitemapEntries(
        ctx.db,
        input.country,
        input.bundeslandSlug,
      ),
    ),

  bundeslandSlugsForSitemapIndex: publicProcedure
    .input(z.object({ country: z.enum(COUNTRIES) }))
    .query(({ ctx, input }) =>
      getBundeslandSlugsForSitemapIndex(ctx.db, input.country),
    ),

  veranstalter: publicProcedure.query(({ ctx }) =>
    getVeranstalterSitemapEntries(ctx.db),
  ),
});
