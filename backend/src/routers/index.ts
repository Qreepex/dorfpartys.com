import { router } from "../trpc/trpc.js";
import { accountClaimsRouter } from "./account-claims.js";
import { adminVerificationRouter } from "./admin-verification.js";
import { eventClaimsRouter } from "./event-claims.js";
import { eventsRouter } from "./events.js";
import { ghostAccountsRouter } from "./ghost-accounts.js";
import { notificationsRouter } from "./notifications.js";
import { organizerNominationsRouter } from "./organizer-nominations.js";
import { reportsRouter } from "./reports.js";
import { resolverRouter } from "./resolver.js";
import { savedEventsRouter } from "./saved-events.js";
import { searchRouter } from "./search.js";
import { sitemapRouter } from "./sitemap.js";
import { statsRouter } from "./stats.js";
import { taxonomyRouter } from "./taxonomy.js";
import { uploadsRouter } from "./uploads.js";
import { usersRouter } from "./users.js";

export const appRouter = router({
  resolver: resolverRouter,
  events: eventsRouter,
  eventClaims: eventClaimsRouter,
  organizerNominations: organizerNominationsRouter,
  accountClaims: accountClaimsRouter,
  ghostAccounts: ghostAccountsRouter,
  taxonomy: taxonomyRouter,
  users: usersRouter,
  uploads: uploadsRouter,
  reports: reportsRouter,
  search: searchRouter,
  sitemap: sitemapRouter,
  stats: statsRouter,
  savedEvents: savedEventsRouter,
  adminVerification: adminVerificationRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
