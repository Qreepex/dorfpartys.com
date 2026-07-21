import type { NotificationType } from "@dorfpartys/shared";
import type { Database } from "../db/index.js";
import { notification } from "../db/schema.js";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  /** Fertig formulierter deutscher Satz - kein typ-spezifisches i18n im Frontend nötig. */
  message: string;
  /** Relativer Pfad zur betreffenden Seite, oder null wenn es keine gibt (z.B. abgelehntes Event). */
  link?: string | null;
}

/**
 * Legt eine Notification für den betroffenen Nutzer an (Navbar-Glocke). Bewusst
 * eine simple Insert-Helper-Funktion statt eines Pub/Sub-Systems - siehe
 * AGENTS.md-Ergänzung zum Notifications-System. "Gelesen markieren" löscht die
 * Zeile wieder (backend/src/routers/notifications.ts), es gibt kein read-Flag.
 */
export async function createNotification(
  db: Database,
  input: CreateNotificationInput,
): Promise<void> {
  await db.insert(notification).values({
    userId: input.userId,
    type: input.type,
    message: input.message,
    link: input.link ?? null,
  });
}
