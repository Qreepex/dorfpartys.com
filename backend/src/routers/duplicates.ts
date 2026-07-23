import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  bundesland as bundeslandTable,
  event,
  kreis,
  partyArt,
  user,
  userProfile,
} from "../db/schema.js";
import { similarityRatio } from "../duplicates/similarity.js";
import { adminProcedure, router } from "../trpc/trpc.js";

// Schwellwerte per Hand kalibriert (kein ML/Postgres-Extension nötig, siehe
// backend/src/duplicates/similarity.ts) - lieber ein paar Grenzfälle
// verpassen als die Liste mit offensichtlich unterschiedlichen Einträgen zu
// fluten, die der Admin dann doch nur wegklickt.
const GHOST_NAME_SIMILARITY_THRESHOLD = 0.85;
const EVENT_TITLE_SIMILARITY_THRESHOLD = 0.8;
const EVENT_DATE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_PAIRS = 100;

/**
 * Duplikat-Kandidaten für /review/duplicates - Ghost-Accounts mit sehr
 * ähnlichem Anzeigenamen und Events mit sehr ähnlichem Titel im selben Kreis
 * und nahem Datum. Rein lesende Heuristik, kein persistenter
 * Dismiss-Workflow (analog reports.ts: "zu individuell, um es generisch
 * abzubilden") - der Admin entscheidet pro Fund direkt vor Ort (löschen oder
 * ignorieren, ohne dass "ignoriert" irgendwo gespeichert wird).
 */
export const duplicatesRouter = router({
  ghostAccounts: adminProcedure.query(async ({ ctx }) => {
    const ghosts = await ctx.db
      .select({
        userId: user.id,
        displayName: userProfile.displayName,
        slug: userProfile.slug,
        createdAt: user.createdAt,
      })
      .from(user)
      .innerJoin(userProfile, eq(userProfile.userId, user.id))
      .where(and(eq(user.isGhost, true), isNull(userProfile.mergedIntoUserId)))
      .orderBy(desc(user.createdAt));

    if (ghosts.length < 2) return [];

    const ghostIds = ghosts.map((g) => g.userId);
    const eventCounts = await ctx.db
      .select({ organizerUserId: event.organizerUserId, total: count() })
      .from(event)
      .where(inArray(event.organizerUserId, ghostIds))
      .groupBy(event.organizerUserId);
    const eventCountByGhost = new Map(
      eventCounts.map((r) => [r.organizerUserId, r.total]),
    );

    const withCounts = ghosts.map((g) => ({
      ...g,
      eventCount: eventCountByGhost.get(g.userId) ?? 0,
    }));

    const pairs: Array<{
      score: number;
      a: (typeof withCounts)[number];
      b: (typeof withCounts)[number];
    }> = [];

    for (let i = 0; i < withCounts.length; i++) {
      for (let j = i + 1; j < withCounts.length; j++) {
        const a = withCounts[i];
        const b = withCounts[j];
        if (!a.displayName || !b.displayName) continue;
        const score = similarityRatio(a.displayName, b.displayName);
        if (score >= GHOST_NAME_SIMILARITY_THRESHOLD) {
          pairs.push({ score, a, b });
        }
      }
    }

    pairs.sort((x, y) => y.score - x.score);
    return pairs.slice(0, MAX_PAIRS);
  }),

  events: adminProcedure.query(async ({ ctx }) => {
    const events = await ctx.db
      .select({
        id: event.id,
        slug: event.slug,
        title: event.title,
        status: event.status,
        startDate: event.startDate,
        kreisId: event.kreisId,
        country: bundeslandTable.country,
        bundeslandName: bundeslandTable.name,
        kreisName: kreis.name,
        partyArtName: partyArt.name,
        organizerName: event.organizerName,
        organizerDisplayName: userProfile.displayName,
      })
      .from(event)
      .leftJoin(bundeslandTable, eq(event.bundeslandId, bundeslandTable.id))
      .leftJoin(kreis, eq(event.kreisId, kreis.id))
      .leftJoin(partyArt, eq(event.partyArtId, partyArt.id))
      .leftJoin(userProfile, eq(userProfile.userId, event.organizerUserId))
      .orderBy(desc(event.createdAt));

    // Nach Kreis gruppieren, um den O(n²)-Vergleich auf plausible Kandidaten
    // zu beschränken (zwei Events in verschiedenen Kreisen sind nie
    // dasselbe Duplikat) statt alle Events der Plattform gegeneinander zu
    // vergleichen.
    const byKreis = new Map<string, typeof events>();
    for (const e of events) {
      const bucket = byKreis.get(e.kreisId);
      if (bucket) bucket.push(e);
      else byKreis.set(e.kreisId, [e]);
    }

    const pairs: Array<{
      score: number;
      a: (typeof events)[number];
      b: (typeof events)[number];
    }> = [];

    for (const bucket of byKreis.values()) {
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          const a = bucket[i];
          const b = bucket[j];

          const bothDated = a.startDate !== null && b.startDate !== null;
          const bothUndated = a.startDate === null && b.startDate === null;
          if (!bothDated && !bothUndated) continue;
          if (
            bothDated &&
            Math.abs(a.startDate!.getTime() - b.startDate!.getTime()) >
            EVENT_DATE_WINDOW_MS
          ) {
            continue;
          }

          const score = similarityRatio(a.title, b.title);
          if (score >= EVENT_TITLE_SIMILARITY_THRESHOLD) {
            pairs.push({ score, a, b });
          }
        }
      }
    }

    pairs.sort((x, y) => y.score - x.score);
    return pairs.slice(0, MAX_PAIRS);
  }),
});
