import { z } from "zod";
import { COUNTRIES } from "@dorfpartys/shared";
import {
  getArtenSitemapEntries,
  getEventSitemapEntries,
  getOrteSitemapEntries,
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
});
