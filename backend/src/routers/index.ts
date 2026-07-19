import { router } from "../trpc/trpc.js";
import { adminVerificationRouter } from "./admin-verification.js";
import { eventsRouter } from "./events.js";
import { reportsRouter } from "./reports.js";
import { resolverRouter } from "./resolver.js";
import { savedEventsRouter } from "./saved-events.js";
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
  reports: reportsRouter,
  sitemap: sitemapRouter,
  stats: statsRouter,
  savedEvents: savedEventsRouter,
  adminVerification: adminVerificationRouter,
});

export type AppRouter = typeof appRouter;
