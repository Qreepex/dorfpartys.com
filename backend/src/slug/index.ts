import { like } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { event } from "../db/schema.js";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Slug-Vergabe für Event-Detailseiten (AGENTS.md 1.7) — entkoppelt von der
 * Slug-Registry der vier Filter-Vokabulare (1.5), da eigener URL-Baum ohne
 * Kollisionsrisiko dorthin. Bei Kollision wird ein Disambiguator angehängt,
 * i.d.R. der Ortsname; da `address_description` Freitext ist, wird ersatzweise
 * der Kreis-Name als strukturierter Näherungswert verwendet.
 */
export async function generateUniqueEventSlug(
  db: Database,
  title: string,
  disambiguator: string,
): Promise<string> {
  const base = slugify(title);
  const existingRows = await db
    .select({ slug: event.slug })
    .from(event)
    .where(like(event.slug, `${base}%`));
  const taken = new Set(existingRows.map((row) => row.slug));

  if (!taken.has(base)) return base;

  const withDisambiguator = `${base}-${slugify(disambiguator)}`;
  if (!taken.has(withDisambiguator)) return withDisambiguator;

  let suffix = 2;
  while (taken.has(`${withDisambiguator}-${suffix}`)) {
    suffix += 1;
  }
  return `${withDisambiguator}-${suffix}`;
}
