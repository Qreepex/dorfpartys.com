import { randomInt } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { event, organizerInviteCode, userProfile } from "../db/schema.js";

// Vermeidet visuell ähnliche Zeichen (0/O, 1/I/L) - Codes werden von Hand
// abgetippt (E-Mail/DM an Veranstalter, Produktvorgabe "möglichst kleine
// Hürde"). 8 Zeichen aus einem 32-Zeichen-Alphabet = genug Entropie, dass eine
// Kollision praktisch ausgeschlossen ist (siehe generateUniqueInviteCode).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/** Generiert einen Code, der noch nicht in der Registry existiert. */
export async function generateUniqueInviteCode(db: Database): Promise<string> {
  for (let attempts = 0; attempts < 5; attempts++) {
    const code = generateInviteCode();
    const [existing] = await db
      .select({ code: organizerInviteCode.code })
      .from(organizerInviteCode)
      .where(eq(organizerInviteCode.code, code));
    if (!existing) return code;
  }
  // Praktisch unerreichbar bei 32^8 möglichen Codes - Fallback, damit die
  // Funktion nie endlos läuft.
  throw new Error("Konnte keinen eindeutigen Einladungscode erzeugen");
}

/**
 * Löst einen Einladungscode beim Abschluss des Onboardings ein
 * (AGENTS.md Abschnitt 5, `users.completeOnboarding`): reibungsloseres
 * Gegenstück zum moderierten `accountClaim`-Workflow (backend/src/routers/
 * account-claims.ts), da der Admin die Identität des Veranstalters bereits
 * vorab kennt (persönliche Ansprache per E-Mail/DM) - keine Moderation nötig,
 * sofortige Übernahme + Verifizierung.
 *
 * Ungültige/bereits verwendete Codes werden bewusst still ignoriert
 * (`redeemed: false`) statt einen Fehler zu werfen - das Onboarding darf dadurch
 * nie blockiert werden (Produktvorgabe "möglichst kleine Hürde").
 */
export async function redeemInviteCode(
  db: Database,
  redeemingUserId: string,
  rawCode: string,
): Promise<{ redeemed: boolean }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { redeemed: false };

  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(organizerInviteCode)
      .where(
        and(
          eq(organizerInviteCode.code, code),
          isNull(organizerInviteCode.usedByUserId),
        ),
      );
    if (!invite) return { redeemed: false };

    const [ghostProfile] = await tx
      .select({ mergedIntoUserId: userProfile.mergedIntoUserId })
      .from(userProfile)
      .where(eq(userProfile.userId, invite.ghostUserId));

    // Ghost bereits anderweitig übernommen (z.B. über den manuellen
    // account_claim-Workflow) - Code trotzdem als verbraucht markieren, aber
    // keine erneute Übernahme mehr auslösen.
    if (ghostProfile?.mergedIntoUserId) {
      await tx
        .update(organizerInviteCode)
        .set({ usedByUserId: redeemingUserId, usedAt: new Date() })
        .where(eq(organizerInviteCode.id, invite.id));
      return { redeemed: false };
    }

    // Alle Events des Ghost-Accounts auf den neu registrierten Account
    // umhängen und sofort als verifiziert markieren (AGENTS.md 5.5-Analogie).
    await tx
      .update(event)
      .set({
        organizerUserId: redeemingUserId,
        organizerVerified: true,
        organizerConfirmed: true,
        updatedAt: new Date(),
      })
      .where(eq(event.organizerUserId, invite.ghostUserId));

    // Ghost-Profil bleibt als dauerhafter Redirect-Stub erhalten statt hart
    // gelöscht zu werden - identisches Muster zu accountClaims.approve()
    // (SEO-Werterhalt alter /veranstalter/{slug}/-Links). Ein Hard-Delete wäre
    // hier zwar nach dem Umhängen aller Events FK-sicher, aber inkonsistent
    // zum bereits etablierten Merge-Muster und würde den Redirect verlieren.
    await tx
      .update(userProfile)
      .set({ mergedIntoUserId: redeemingUserId, updatedAt: new Date() })
      .where(eq(userProfile.userId, invite.ghostUserId));

    // Der einlösende Account gilt ab sofort als verifizierter Veranstalter
    // (auch für künftige Selbst-Einträge, AGENTS.md 5.5).
    await tx
      .update(userProfile)
      .set({
        verifiedAt: new Date(),
        verificationMethod: "invite_code",
        updatedAt: new Date(),
      })
      .where(eq(userProfile.userId, redeemingUserId));

    await tx
      .update(organizerInviteCode)
      .set({ usedByUserId: redeemingUserId, usedAt: new Date() })
      .where(eq(organizerInviteCode.id, invite.id));

    return { redeemed: true };
  });
}
