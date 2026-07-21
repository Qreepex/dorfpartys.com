import type { NotificationType } from '../constants/index.js';

/**
 * Notification für die Navbar-Glocke (AGENTS.md-Ergänzung: Notifications-System).
 * `message` kommt bereits fertig formuliert vom Backend (kein typ-spezifisches
 * i18n im Frontend nötig). "Gelesen" = die Zeile wird gelöscht (kein read-Flag),
 * daher gibt es hier auch keinen `read`-Status - Existenz in der Liste IST ungelesen.
 */
export interface Notification {
	id: string;
	type: NotificationType;
	message: string;
	/** Relativer Pfad zur betreffenden Seite, z.B. Event-Detailseite oder /profil - null wenn es keine gibt. */
	link: string | null;
	createdAt: string;
}
