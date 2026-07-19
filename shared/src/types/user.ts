import type { UserRole } from '../constants/index.js';

export interface User {
	id: string;
	authentikSubject: string;
	role: UserRole;
	/** null = Onboarding-Flow nach dem Login noch nicht abgeschlossen/übersprungen. */
	onboardingCompletedAt: string | null;
	createdAt: string;
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
	bio: string | null;
	updatedAt: string;
}

export interface UserLink {
	id: string;
	userId: string;
	url: string;
	label: string;
	position: number;
}
