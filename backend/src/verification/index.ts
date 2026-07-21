import { randomBytes } from "crypto";

export function generateVerificationCode(): string {
  return randomBytes(6).toString("hex").toUpperCase();
}

export function extractInstagramHandle(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    const match = pathname.match(/^\/([a-zA-Z0-9_.]+)\/?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function extractTiktokHandle(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    const match = pathname.match(/^\/@?([a-zA-Z0-9_.]+)\/?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

interface VerificationRelevantFields {
  displayName?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  facebookUrl?: string | null;
}

export function isVerificationRelevantChange(
  existing: VerificationRelevantFields | null | undefined,
  incoming: VerificationRelevantFields,
): boolean {
  if (!existing) return false;

  const checkField = (field: keyof VerificationRelevantFields) => {
    const incomingValue = incoming[field] ?? null;
    const existingValue = existing[field] ?? null;
    return incomingValue !== existingValue;
  };

  return (
    checkField("displayName") ||
    checkField("websiteUrl") ||
    checkField("instagramUrl") ||
    checkField("tiktokUrl") ||
    checkField("facebookUrl")
  );
}

/**
 * Berechnet den *aktuell* gültigen Verifizierungsstatus des hinterlegten
 * Veranstalters eines Events.
 *
 * Hintergrund (Bugfix): `event.organizerVerified` (Spalte in db/schema.ts)
 * wird nur als Momentaufnahme zum Zeitpunkt der jeweils letzten
 * Veranstalter-Zuweisung geschrieben (Einreichung/Bearbeiten, Genehmigung
 * einer organizer_nomination, Genehmigung eines event_claim oder
 * account_claim, Einlösen eines Einladungscodes - siehe die jeweiligen
 * Router). Verifiziert sich ein Nutzer aber ERST NACHDEM sein Event schon
 * angelegt wurde (der übliche Fall, AGENTS.md 5.5 "nicht-verifizierter
 * Nutzer trägt Event ein, verifiziert sich danach"), bleibt die gespeicherte
 * Spalte auf `false` stehen, obwohl `user_profile.verifiedAt` inzwischen
 * gesetzt ist - das Verified-Badge auf der Event-Seite würde fälschlich
 * nicht angezeigt. Symmetrisch dazu: wird eine Verifizierung durch eine
 * spätere, verifizierungsrelevante Profiländerung zurückgesetzt
 * (`isVerificationRelevantChange`/`users.upsertProfile`), bliebe die Spalte
 * fälschlich auf `true` stehen.
 *
 * Statt die Spalte an jeder denkbaren Stelle, die `user_profile.verifiedAt`
 * ändert, nachträglich zu aktualisieren (fehleranfällig - es gibt mehrere
 * solche Stellen), wird der für Anzeige/Berechtigungsprüfungen relevante
 * Verifizierungsstatus IMMER live gegen das aktuelle Profil berechnet. Die
 * gespeicherte Spalte bleibt bestehen (Schreiblogik unverändert) und dient
 * nur noch als historische Momentaufnahme, ist aber nicht mehr die
 * Autorität für Anzeige/Berechtigung - diese Funktion ist die einzige
 * Quelle der Wahrheit dafür und wird von allen Lesestellen genutzt
 * (`events.getBySlug`, `events.listInReview`, `eventClaims.create`).
 *
 * Eine ausstehende Nominierung eines fremden Profils
 * (`organizerConfirmed === false`) zählt bewusst nie als verifiziert, auch
 * wenn das nominierte Profil selbst bereits verifiziert ist - das Event
 * übernimmt dessen Verifizierungsstatus erst nach Bestätigung durch den
 * Profilinhaber/eine Moderation (organizer-nominations.ts `confirm`).
 */
export function isOrganizerCurrentlyVerified(params: {
  organizerUserId: string | null | undefined;
  organizerConfirmed: boolean;
  organizerProfileVerifiedAt: Date | null | undefined;
}): boolean {
  if (!params.organizerUserId || !params.organizerConfirmed) return false;
  return !!params.organizerProfileVerifiedAt;
}
