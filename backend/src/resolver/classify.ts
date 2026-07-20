import type { Country } from "@dorfpartys/shared";
import type { TaxonomyRepository } from "./types.js";

export interface ClassifiedSegments {
  bundeslandSlug?: string;
  bundeslandIdExplicit?: string;
  kreisSlug?: string;
  kreisId?: string;
  bundeslandIdImplied?: string;
  bundeslandSlugImplied?: string;
  artSlug?: string;
  partyArtId?: string;
}

export type ClassifyResult =
  | { ok: true; classified: ClassifiedSegments }
  | { ok: false; reason: "not-found" | "bundesland-mismatch" };

/**
 * Ordnet unklassifizierte Pfad-Segmente den vier kontrollierten Vokabularen zu
 * (AGENTS.md 1.3). Die Vokabulare sind global kollisionsfrei (1.5), daher ist
 * die Prüfreihenfolge nur zur Lesbarkeit an die Pseudocode-Vorlage angelehnt.
 */
export async function classifySegments(
  country: Country,
  segments: string[],
  repo: TaxonomyRepository,
): Promise<ClassifyResult> {
  const classified: ClassifiedSegments = {};

  for (const segment of segments) {
    const bundeslandMatch = await repo.findBundeslandBySlug(country, segment);
    if (bundeslandMatch) {
      if (classified.bundeslandSlug) return { ok: false, reason: "not-found" };
      classified.bundeslandSlug = bundeslandMatch.slug;
      classified.bundeslandIdExplicit = bundeslandMatch.id;
      continue;
    }

    const kreisMatch = await repo.findKreisBySlug(country, segment);
    if (kreisMatch) {
      if (classified.kreisSlug) return { ok: false, reason: "not-found" };
      classified.kreisSlug = kreisMatch.slug;
      classified.kreisId = kreisMatch.id;
      classified.bundeslandIdImplied = kreisMatch.bundeslandId;
      classified.bundeslandSlugImplied = kreisMatch.bundeslandSlug;
      continue;
    }

    const partyArtMatch = await repo.findPartyArtBySlug(segment);
    if (partyArtMatch) {
      if (classified.artSlug) return { ok: false, reason: "not-found" };
      classified.artSlug = partyArtMatch.slug;
      classified.partyArtId = partyArtMatch.id;
      continue;
    }

    return { ok: false, reason: "not-found" };
  }

  if (
    classified.bundeslandIdExplicit &&
    classified.bundeslandIdImplied &&
    classified.bundeslandIdExplicit !== classified.bundeslandIdImplied
  ) {
    return { ok: false, reason: "bundesland-mismatch" };
  }

  return { ok: true, classified };
}
