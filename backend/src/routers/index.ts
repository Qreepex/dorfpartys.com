import { router } from "../trpc/trpc.js";
import { eventsRouter } from "./events.js";
import { resolverRouter } from "./resolver.js";
import { sitemapRouter } from "./sitemap.js";
import { statsRouter } from "./stats.js";
import { taxonomyRouter } from "./taxonomy.js";
import { uploadsRouter } from "./uploads.js";
import { usersRouter } from "./users.js";

export const appRouter = router({
  resolver: resolverRouter,
  events: eventsRouter,
  taxonomy: taxonomyRouter,
  users: usersRouter,
  uploads: uploadsRouter,
  sitemap: sitemapRouter,
  stats: statsRouter,
});

export type AppRouter = typeof appRouter;
