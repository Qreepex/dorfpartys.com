import { and, like, ne } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { event, userProfile } from "../db/schema.js";

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
 * Slug-Vergabe für Event-Detailseiten (AGENTS.md 1.7) - entkoppelt von der
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

/**
 * Slug-Vergabe für Veranstalter-Profile (/{country}/veranstalter/{slug}/,
 * AGENTS.md Abschnitt 3/8) - eigener URL-Baum, kein Kollisionsrisiko zu den
 * vier Filter-Vokabularen. Wird beim Speichern des Profils neu aus dem
 * `display_name` abgeleitet, sofern sich dieser geändert hat.
 */
export async function generateUniqueOrganizerSlug(
  db: Database,
  displayName: string,
  currentUserId: string,
): Promise<string> {
  const base = slugify(displayName) || "veranstalter";
  const existingRows = await db
    .select({ slug: userProfile.slug })
    .from(userProfile)
    .where(
      and(
        like(userProfile.slug, `${base}%`),
        ne(userProfile.userId, currentUserId),
      ),
    );
  const taken = new Set(existingRows.map((row) => row.slug));

  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}
