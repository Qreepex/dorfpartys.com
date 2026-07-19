import type { CanonicalFilterSlugs } from "@dorfpartys/shared";
import type { ClassifiedSegments } from "./classify.js";

/** Kanonische Slugs - Kreis impliziert Bundesland, falls kein explizites Bundesland vorhanden ist (AGENTS.md 1.4). */
export function canonicalSlugsFor(
  classified: ClassifiedSegments,
): CanonicalFilterSlugs {
  return {
    bundeslandSlug:
      classified.bundeslandSlug ?? classified.bundeslandSlugImplied,
    kreisSlug: classified.kreisSlug,
    artSlug: classified.artSlug,
    monatSlug: classified.monatSlug,
  };
}

/** Kanonische Segment-Reihenfolge: bundesland -> kreis -> art -> monat (AGENTS.md 1.2/1.4). */
export function canonicalSegmentList(classified: ClassifiedSegments): string[] {
  const slugs = canonicalSlugsFor(classified);
  return [
    slugs.bundeslandSlug,
    slugs.kreisSlug,
    slugs.artSlug,
    slugs.monatSlug,
  ].filter((segment): segment is string => Boolean(segment));
}
