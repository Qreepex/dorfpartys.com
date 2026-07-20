import {
  buildFilterUrl,
  type Country,
  type ResolveOutcome,
} from "@dorfpartys/shared";
import { canonicalSegmentList, canonicalSlugsFor } from "./canonicalize.js";
import { classifySegments } from "./classify.js";
import type { TaxonomyRepository } from "./types.js";

/**
 * Segment-Resolver + Kanonisierung/Redirect nach AGENTS.md 1.3–1.6.
 * Reine Orchestrierung - DB-Zugriff läuft ausschließlich über `repo`, damit
 * die Logik ohne echte Datenbank getestet werden kann.
 */
export async function resolve(
  country: Country,
  segments: string[],
  repo: TaxonomyRepository,
): Promise<ResolveOutcome> {
  if (segments.length > 4) {
    return { kind: "not-found" };
  }

  const classifyResult = await classifySegments(country, segments, repo);
  if (!classifyResult.ok) {
    return { kind: "not-found" };
  }

  const { classified } = classifyResult;
  const canonicalSlugs = canonicalSlugsFor(classified);
  const canonicalSegments = canonicalSegmentList(classified);

  const isCanonicalOrder =
    canonicalSegments.length === segments.length &&
    canonicalSegments.every((segment, i) => segment === segments[i]);

  if (!isCanonicalOrder) {
    return {
      kind: "redirect",
      location: buildFilterUrl(country, canonicalSlugs),
      permanent: true,
    };
  }

  const filterIds = {
    bundeslandId:
      classified.bundeslandIdExplicit ?? classified.bundeslandIdImplied,
    kreisId: classified.kreisId,
    partyArtId: classified.partyArtId,
  };

  const totalFuture = await repo.countApprovedEvents(country, filterIds);
  const futureResults =
    totalFuture > 0 ? await repo.listApprovedEvents(country, filterIds) : [];

  // Archiv: letzte 12 Monate, max 25 Events
  const pastResults = await repo.listApprovedEventsPast12Months(
    country,
    filterIds,
    25,
  );

  const allResults = [...futureResults, ...pastResults];
  const total = futureResults.length + pastResults.length;
  const hasAnyEvents = total > 0;

  // Konstruiere OG-Image-URL basierend auf Filters
  // Format: og-image-{art}-{bundesland}-{kreis}-{country}
  // Mindestens ein Filter sollte vorhanden sein (art oder bundesland)
  const ogImageSlug = [
    canonicalSlugs.artSlug,
    canonicalSlugs.kreisSlug ?? canonicalSlugs.bundeslandSlug,
    country,
  ]
    .filter(Boolean)
    .join("-");

  const ogImageUrl = ogImageSlug
    ? `https://speicher.dorfpartys.com/og-images/og-image-${ogImageSlug}.png`
    : undefined;

  return {
    kind: "result",
    filters: {
      country,
      bundeslandSlug: canonicalSlugs.bundeslandSlug ?? null,
      kreisSlug: canonicalSlugs.kreisSlug ?? null,
      artSlug: canonicalSlugs.artSlug ?? null,
    },
    results: allResults,
    total,
    futureCount: futureResults.length,
    pastCount: pastResults.length,
    // noindex für absolut leere Filter (0 zukünftig + 0 archiv), ansonsten index
    indexable: hasAnyEvents,
    ogImageUrl,
    // Navigation tree wird vom tRPC-Router enriched (siehe resolver.ts router)
    navigationTree: undefined,
  };
}
