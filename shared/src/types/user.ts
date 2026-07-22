import type { UserRole, VerificationMethod } from '../constants/index.js';

export interface User {
	id: string;
	/** null bei Ghost-Accounts (nicht registrierte Veranstalter, siehe isGhost). */
	authentikSubject: string | null;
	role: UserRole;
	/** null = Onboarding-Flow nach dem Login noch nicht abgeschlossen/übersprungen. */
	onboardingCompletedAt: string | null;
	/** Platzhalter-Account für einen nicht registrierten Veranstalter (AGENTS.md 5.4). */
	isGhost: boolean;
	createdAt: string;
	/** Schlanke Profil-Vorschau für die Navbar-User-Card, siehe users.me. */
	displayName: string | null;
	avatarUrl: string | null;
}

export interface UserProfile {
	userId: string;
	slug: string | null;
	/** Standardmäßig privat - öffentlich ist Voraussetzung fürs Eintragen von Veranstaltungen. */
	isPublic: boolean;
	displayName: string | null;
	avatarS3Key: string | null;
	websiteUrl: string | null;
	instagramUrl: string | null;
	facebookUrl: string | null;
	tiktokUrl: string | null;
	bio: string | null;
	// Verifizierung
	verifiedAt: string | null;
	verificationMethod: VerificationMethod | null;
	verificationRequestedAt: string | null;
	updatedAt: string;
}

export interface UserLink {
	id: string;
	userId: string;
	url: string;
	label: string;
	position: number;
}
