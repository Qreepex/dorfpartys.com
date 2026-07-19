import { eq } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { userProfile } from "../db/schema.js";

// Reservierte Slugs die nicht von Usern verwendet werden dürfen
const RESERVED_SLUGS = new Set([
  "admin",
  "review",
  "auth",
  "profil",
  "api",
  "v1",
  "veranstalter",
  "partyliste",
  "land",
  "datenschutz",
  "impressum",
  "nutzungsbedingungen",
  "report",
  "willkommen",
  "faq",
  "sitemap",
  "robots",
  ".well-known",
]);

export function validateSlugFormat(slug: string): { valid: boolean; error?: string } {
  // Mindestens 2 Zeichen
  if (slug.length < 2) {
    return { valid: false, error: "Slug muss mindestens 2 Zeichen lang sein" };
  }

  // Maximal 50 Zeichen
  if (slug.length > 50) {
    return { valid: false, error: "Slug darf maximal 50 Zeichen lang sein" };
  }

  // Nur Kleinbuchstaben, Zahlen, Bindestrich
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return {
      valid: false,
      error: "Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten",
    };
  }

  // Nicht mit Bindestrich anfangen oder enden
  if (slug.startsWith("-") || slug.endsWith("-")) {
    return { valid: false, error: "Slug darf nicht mit Bindestrich anfangen oder enden" };
  }

  // Keine doppelten Bindestriche
  if (slug.includes("--")) {
    return { valid: false, error: "Slug darf keine doppelten Bindestriche enthalten" };
  }

  // Nicht reserviert
  if (RESERVED_SLUGS.has(slug)) {
    return { valid: false, error: `"${slug}" ist reserviert und nicht verfügbar` };
  }

  return { valid: true };
}

export async function isSlugAvailable(
  db: Database,
  slug: string,
  excludeUserId?: string
): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.slug, slug));

  if (!existing) return true;
  if (excludeUserId && existing.userId === excludeUserId) return true;
  return false;
}
