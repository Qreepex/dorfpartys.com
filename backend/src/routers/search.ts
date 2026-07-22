import type {} from "@fastify/cookie";
import { and, asc, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
  COUNTRIES,
  COUNTRY_NAMES,
  buildFilterUrl,
  type Country,
} from "@dorfpartys/shared";
import {
  bundesland,
  event,
  kreis,
  partyArt,
  user,
  userProfile,
} from "../db/schema.js";
import { isUpcomingOrDateless } from "../resolver/event-date-filters.js";
import { buildPublicStorageUrl } from "../storage/index.js";
import type { Context } from "../trpc/context.js";
import { publicProcedure, router } from "../trpc/trpc.js";
import { isOrganizerCurrentlyVerified } from "../verification/index.js";

// Anzahl Treffer pro Kategorie in der globalen Navbar-Suche - bewusst klein
// gehalten (Autocomplete-Dropdown, keine vollwertige Ergebnisliste wie eine
// Filter-Seite, AGENTS.md 1).
const AUTOCOMPLETE_EVENT_LIMIT = 6;
const AUTOCOMPLETE_ORGANIZER_LIMIT = 6;

// Für die vollwertige Ergebnisseite (/suche) bewusst großzügiger, aber hart
// gedeckelt, um die DB bei generischen/kurzen Suchbegriffen (die potenziell
// sehr viele ILIKE-Treffer haben) nicht zu belasten.
const FULL_EVENT_LIMIT = 100;
const FULL_ORGANIZER_LIMIT = 20;

// Treffer aus den Filter-Vokabularen (findTaxonomyMatches) - eine mehrdeutige
// Teileingabe kann mehrere plausible Orte gleichzeitig treffen (z.B. "Schl"
// -> sowohl Bundesland "Schleswig-Holstein" als auch Kreis
// "Schleswig-Flensburg"), daher wie bei Events/Veranstaltern gedeckelt statt
// nur ein einzelnes "bestes" Ergebnis zu raten.
const AUTOCOMPLETE_LOCATION_LIMIT = 5;
const FULL_LOCATION_LIMIT = 10;

// Normalisiert einen Suchbegriff/Namen auf eine Wort-Token-Liste (Kleinschreibung,
// Bindestriche als Leerzeichen behandelt) - ermöglicht z.B. "Schleswig Holstein"
// (ohne Bindestrich) gegen den Bundesland-Namen "Schleswig-Holstein" zu matchen.
function tokenize(value: string): string[] {
  const normalized = value
    .toLowerCase()
    .replace(/[-,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 0 ? normalized.split(" ") : [];
}

// Prüft, ob `nameTokens` als zusammenhängende Wortfolge in `queryTokens`
// vorkommt. Zwei Match-Arten, damit auch unvollständig getippte Suchbegriffe
// (Live-Autocomplete) treffen:
// - "complete": die VOLLE Wortfolge von `nameTokens` steckt (an beliebiger
//   Position, jedes Token per Prefix) in `queryTokens` - z.B. "Zelt" (Prefix
//   von "zeltfeten", einzelnes Token) oder "Open Air Nieders" (volle Phrase
//   "Open Air" + Prefix von "Niedersachsen", aber als zweiter, unabhängiger
//   Treffer betrachtet).
// - "partial": nur ein FÜHRENDER Teil von `nameTokens` wurde bisher getippt,
//   und zwar exakt am ENDE des Suchbegriffs (der Nutzer tippt gerade an
//   diesem Namen) - z.B. "Schle" für "Schleswig-Holstein" (erst 1 von 2
//   Wörtern, keine Chance auf einen "complete"-Treffer, da noch zu kurz).
// "complete" schlägt "partial" bei der Sortierung nach `matchScore` immer,
// damit z.B. "Sachsen" (komplettes Wort) das eigenständige Bundesland
// "Sachsen" liefert statt fälschlich in Richtung "Sachsen-Anhalt" aufzulösen
// - erst "Sachsen A..." matched auch "Sachsen-Anhalt" komplett und gewinnt
// dann als das längere (spezifischere) Complete-Match.
type PhraseMatchKind = "complete" | "partial";

function findPhraseMatch(
  queryTokens: string[],
  nameTokens: string[],
): PhraseMatchKind | null {
  if (nameTokens.length === 0) return null;

  for (let i = 0; i <= queryTokens.length - nameTokens.length; i++) {
    if (nameTokens.every((token, j) => token.startsWith(queryTokens[i + j]))) {
      return "complete";
    }
  }

  const maxPartialLength = Math.min(nameTokens.length - 1, queryTokens.length);
  for (let length = maxPartialLength; length >= 1; length--) {
    const start = queryTokens.length - length;
    if (start < 0) continue;
    let matches = true;
    for (let j = 0; j < length; j++) {
      if (!nameTokens[j].startsWith(queryTokens[start + j])) {
        matches = false;
        break;
      }
    }
    if (matches) return "partial";
  }

  return null;
}

function matchScore(kind: PhraseMatchKind, nameTokenCount: number): number {
  return (kind === "complete" ? 1000 : 0) + nameTokenCount;
}

/**
 * Findet ALLE passenden Namen (nicht nur den einen "besten") - eine
 * mehrdeutige Teileingabe wie "Schl" matcht sowohl das Bundesland
 * "Schleswig-Holstein" als auch den Kreis "Schleswig-Flensburg", und beide
 * sollen als eigenständige Treffer erscheinen statt dass einer den anderen
 * verdeckt (siehe `findTaxonomyMatches` unten).
 */
function allNameMatches<T extends { name: string }>(
  rows: T[],
  queryTokens: string[],
): Array<T & { matchScore: number }> {
  const matches: Array<T & { matchScore: number }> = [];
  for (const row of rows) {
    const nameTokens = tokenize(row.name);
    const kind = findPhraseMatch(queryTokens, nameTokens);
    if (!kind) continue;
    matches.push({ ...row, matchScore: matchScore(kind, nameTokens.length) });
  }
  return matches;
}

function allCountryMatches(
  queryTokens: string[],
): Array<{ country: Country; matchScore: number }> {
  const matches: Array<{ country: Country; matchScore: number }> = [];
  for (const country of COUNTRIES) {
    const nameTokens = tokenize(COUNTRY_NAMES[country]);
    const kind = findPhraseMatch(queryTokens, nameTokens);
    if (!kind) continue;
    matches.push({ country, matchScore: matchScore(kind, nameTokens.length) });
  }
  return matches;
}

/** Wählt den höchstbewerteten Treffer aus einer Match-Liste (für die Party-Art, von der genau EIN Treffer pro Kombination verwendet wird - siehe `findTaxonomyMatches`). */
function bestOf<T extends { matchScore: number }>(
  matches: T[],
): T | undefined {
  return matches.reduce<T | undefined>(
    (best, candidate) =>
      !best || candidate.matchScore > best.matchScore ? candidate : best,
    undefined,
  );
}

export type TaxonomyResult = {
  type: "taxonomy";
  href: string;
  label: string;
  country: Country;
};

type GeoCandidate = {
  country: Country;
  bundeslandSlug?: string;
  bundeslandName?: string;
  kreisSlug?: string;
  kreisName?: string;
  matchScore: number;
  // true, wenn das LAND selbst im Suchbegriff erkannt wurde (z.B.
  // "Deutschland") - steuert, ob der Ländername explizit im Label auftaucht,
  // statt nur als Country-Badge in der UI.
  explicitCountry: boolean;
};

// Ergänzt die Freitextsuche um Treffer aus den drei Filter-Vokabularen +
// Land (AGENTS.md 1.3) - z.B. "Schleswig Holstein" -> /de/schleswig-holstein/,
// "Deutschland" -> /de/, "Open Air Niedersachsen" -> /de/niedersachsen/open-air/.
// Eine mehrdeutige Eingabe kann mehrere Geo-Kandidaten gleichzeitig treffen
// (z.B. "Schl" -> Bundesland "Schleswig-Holstein" UND Kreis
// "Schleswig-Flensburg", "Zelt deutsc" -> Kreis "Deutschlandsberg" UND Land
// "Deutschland") - jeder wird als eigener Treffer zurückgegeben, jeweils mit
// derselben (einzigen) Party-Art kombiniert, falls eine erkannt wurde. Eine
// reine Geo-Suche ("nur Land/Bundesland/Kreis") liefert daher bewusst nur
// die Geo-Seite(n) selbst, nicht zusätzlich jede Party-Art-Unterseite dazu.
async function findTaxonomyMatches(
  ctx: Context,
  query: string,
  preferredCountry: Country,
  limit: number,
): Promise<TaxonomyResult[]> {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const [bundeslandRows, kreisRows, partyArtRows] = await Promise.all([
    ctx.db
      .select({
        slug: bundesland.slug,
        name: bundesland.name,
        country: bundesland.country,
      })
      .from(bundesland),
    ctx.db
      .select({
        slug: kreis.slug,
        name: kreis.name,
        bundeslandSlug: bundesland.slug,
        bundeslandName: bundesland.name,
        country: bundesland.country,
      })
      .from(kreis)
      .innerJoin(bundesland, eq(kreis.bundeslandId, bundesland.id)),
    ctx.db
      .select({ slug: partyArt.slug, name: partyArt.name })
      .from(partyArt)
      .where(eq(partyArt.active, true)),
  ]);

  const partyArtMatch = bestOf(allNameMatches(partyArtRows, queryTokens));

  const geoCandidates: GeoCandidate[] = [
    ...allCountryMatches(queryTokens).map((match) => ({
      country: match.country,
      matchScore: match.matchScore,
      explicitCountry: true,
    })),
    ...allNameMatches(bundeslandRows, queryTokens).map((match) => ({
      country: match.country,
      bundeslandSlug: match.slug,
      bundeslandName: match.name,
      matchScore: match.matchScore,
      explicitCountry: false,
    })),
    ...allNameMatches(kreisRows, queryTokens).map((match) => ({
      country: match.country,
      bundeslandSlug: match.bundeslandSlug,
      bundeslandName: match.bundeslandName,
      kreisSlug: match.slug,
      kreisName: match.name,
      matchScore: match.matchScore,
      explicitCountry: false,
    })),
  ];

  if (geoCandidates.length === 0) {
    if (!partyArtMatch) return [];
    // Reine Party-Art-Suche ohne Geo-Bezug ("Schützenfeste") hat keinen
    // Country aus dem Suchbegriff selbst - fällt auf das bevorzugte Land des
    // Nutzers zurück (country-Cookie, AGENTS.md 5b), sonst "de". Der
    // Ländername taucht dabei bewusst NICHT im Label auf, da er nicht Teil
    // der Eingabe war.
    return [
      {
        type: "taxonomy",
        href: buildFilterUrl(preferredCountry, { artSlug: partyArtMatch.slug }),
        label: partyArtMatch.name,
        country: preferredCountry,
      },
    ];
  }

  geoCandidates.sort((a, b) => b.matchScore - a.matchScore);

  const seenHrefs = new Set<string>();
  const results: TaxonomyResult[] = [];
  for (const candidate of geoCandidates) {
    const href = buildFilterUrl(candidate.country, {
      bundeslandSlug: candidate.bundeslandSlug,
      kreisSlug: candidate.kreisSlug,
      artSlug: partyArtMatch?.slug,
    });
    if (seenHrefs.has(href)) continue;
    seenHrefs.add(href);

    const labelParts = candidate.explicitCountry
      ? [COUNTRY_NAMES[candidate.country]]
      : [candidate.bundeslandName, candidate.kreisName].filter(
          (part): part is string => Boolean(part),
        );
    if (partyArtMatch) labelParts.push(partyArtMatch.name);

    results.push({
      type: "taxonomy",
      href,
      label: labelParts.join(" · "),
      country: candidate.country,
    });

    if (results.length >= limit) break;
  }

  return results;
}

/**
 * Gemeinsame Such-Query für Events + Veranstalter, genutzt sowohl vom
 * Autocomplete-Dropdown (`global`, kleine Limits) als auch von der
 * vollwertigen Ergebnisseite `/suche` (`full`, große Limits) - dieselbe
 * Sortierung/Feldauswahl, nur unterschiedlich stark gedeckelt.
 */
async function runSearch(
  ctx: Context,
  query: string,
  eventLimit: number,
  organizerLimit: number,
  locationLimit: number,
) {
  const pattern = `%${query}%`;
  const cookieCountry = ctx.req.cookies?.country;
  const preferredCountry: Country = (
    COUNTRIES as readonly string[]
  ).includes(cookieCountry ?? "")
    ? (cookieCountry as Country)
    : "de";

  const [eventRows, organizerRows, locations] = await Promise.all([
    ctx.db
      .select({
        slug: event.slug,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        country: bundesland.country,
        bundeslandName: bundesland.name,
        kreisName: kreis.name,
        partyArtName: partyArt.name,
        customColor: event.customColor,
        organizerName: event.organizerName,
        organizerUserId: event.organizerUserId,
        organizerConfirmed: event.organizerConfirmed,
        organizerDisplayName: userProfile.displayName,
        organizerProfileVerifiedAt: userProfile.verifiedAt,
      })
      .from(event)
      .innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
      .innerJoin(kreis, eq(event.kreisId, kreis.id))
      .innerJoin(partyArt, eq(event.partyArtId, partyArt.id))
      .leftJoin(userProfile, eq(event.organizerUserId, userProfile.userId))
      .where(
        // Nur freigeschaltete Events (AGENTS.md 2: "Event erst nach
        // status = approved öffentlich sichtbar") - draft/in_review/
        // rejected tauchen in der öffentlichen Suche nie auf.
        and(eq(event.status, "approved"), ilike(event.title, pattern)),
      )
      // Sortierung: zuerst kommende/dateless Events (isUpcomingOrDateless,
      // siehe resolver/event-date-filters.ts), darunter aufsteigend nach
      // Startdatum - das am ehesten stattfindende zuerst. Dateless Events
      // (kein Termin bekannt) fallen ans Ende ihrer Gruppe (COALESCE auf
      // 'infinity'). Vergangene Events folgen danach, absteigend (jüngstes
      // zuerst) - analog zur upcoming/past-Aufteilung in saved-events.ts.
      // Der zweite/dritte Sortierschlüssel ist jeweils per CASE an seine
      // Gruppe gebunden (NULL in der anderen Gruppe), sonst würde der
      // aufsteigende Schlüssel die gewünschte absteigende Reihenfolge der
      // vergangenen Events überschreiben.
      .orderBy(
        asc(sql`(case when ${isUpcomingOrDateless} then 0 else 1 end)`),
        asc(
          sql`(case when ${isUpcomingOrDateless} then coalesce(${event.startDate}, 'infinity'::timestamptz) end)`,
        ),
        desc(
          sql`(case when not (${isUpcomingOrDateless}) then ${event.startDate} end)`,
        ),
      )
      .limit(eventLimit),

    ctx.db
      .select({
        userId: userProfile.userId,
        slug: userProfile.slug,
        displayName: userProfile.displayName,
        avatarS3Key: userProfile.avatarS3Key,
        verifiedAt: userProfile.verifiedAt,
      })
      .from(userProfile)
      .innerJoin(user, eq(user.id, userProfile.userId))
      .where(
        and(
          eq(userProfile.isPublic, true),
          isNull(userProfile.mergedIntoUserId),
          ilike(userProfile.displayName, pattern),
        ),
      )
      .orderBy(desc(userProfile.verifiedAt))
      .limit(organizerLimit),

    findTaxonomyMatches(ctx, query, preferredCountry, locationLimit),
  ]);

  // Zweiter, schlanker Query nur für die gefundenen Veranstalter: Anzahl
  // + Länder ihrer freigeschalteten Events (für die "3 Veranstaltungen in
  // DE"-Anzeige in der Ergebnisliste), gruppiert statt N+1.
  const organizerIds = organizerRows.map((row) => row.userId);
  const statsByOrganizer = new Map<
    string,
    { count: number; countries: Set<string> }
  >();
  if (organizerIds.length > 0) {
    const statRows = await ctx.db
      .select({
        organizerUserId: event.organizerUserId,
        country: bundesland.country,
        count: sql<number>`count(*)`,
      })
      .from(event)
      .innerJoin(bundesland, eq(event.bundeslandId, bundesland.id))
      .where(
        and(
          eq(event.status, "approved"),
          inArray(event.organizerUserId, organizerIds),
        ),
      )
      .groupBy(event.organizerUserId, bundesland.country);

    for (const row of statRows) {
      if (!row.organizerUserId) continue;
      const entry = statsByOrganizer.get(row.organizerUserId) ?? {
        count: 0,
        countries: new Set<string>(),
      };
      entry.count += Number(row.count);
      entry.countries.add(row.country);
      statsByOrganizer.set(row.organizerUserId, entry);
    }
  }

  const events = eventRows
    .filter((row): row is typeof row & { slug: string } => !!row.slug)
    .map((row) => ({
      type: "event" as const,
      slug: row.slug,
      title: row.title,
      country: row.country,
      bundeslandName: row.bundeslandName,
      kreisName: row.kreisName,
      partyArtName: row.partyArtName,
      customColor: row.customColor,
      startDate: row.startDate ? row.startDate.toISOString() : null,
      endDate: row.endDate ? row.endDate.toISOString() : null,
      organizerName:
        row.organizerDisplayName ?? row.organizerName ?? "Veranstalter",
      organizerVerified: isOrganizerCurrentlyVerified({
        organizerUserId: row.organizerUserId,
        organizerConfirmed: row.organizerConfirmed,
        organizerProfileVerifiedAt: row.organizerProfileVerifiedAt,
      }),
    }));

  const organizers = organizerRows
    .filter((row): row is typeof row & { slug: string } => !!row.slug)
    .map((row) => {
      const stats = statsByOrganizer.get(row.userId);
      return {
        type: "organizer" as const,
        slug: row.slug,
        displayName: row.displayName ?? "Unbenannt",
        avatarUrl: row.avatarS3Key
          ? buildPublicStorageUrl(row.avatarS3Key)
          : null,
        verified: !!row.verifiedAt,
        eventCount: stats?.count ?? 0,
        countries: stats ? Array.from(stats.countries) : [],
      };
    });

  return { events, organizers, locations };
}

// Globale Freitextsuche für die Lupe in der Navbar - durchsucht Events
// (Titel, nur approved) und Veranstalter-Profile (Anzeigename, nur
// öffentlich/nicht übernommen) parallel, analog zu users.searchOrganizers.
export const searchRouter = router({
  global: publicProcedure
    .input(z.object({ query: z.string().trim().min(1).max(100) }))
    .query(({ ctx, input }) =>
      runSearch(
        ctx,
        input.query,
        AUTOCOMPLETE_EVENT_LIMIT,
        AUTOCOMPLETE_ORGANIZER_LIMIT,
        AUTOCOMPLETE_LOCATION_LIMIT,
      ),
    ),

  // Vollwertige Ergebnisseite `/suche?q=...` - gleiche Suche wie `global`,
  // aber mit größeren (aber weiterhin gedeckelten) Limits statt der
  // Autocomplete-Kürzung auf 6 Treffer pro Kategorie.
  full: publicProcedure
    .input(z.object({ query: z.string().trim().min(1).max(100) }))
    .query(({ ctx, input }) =>
      runSearch(
        ctx,
        input.query,
        FULL_EVENT_LIMIT,
        FULL_ORGANIZER_LIMIT,
        FULL_LOCATION_LIMIT,
      ),
    ),
});
