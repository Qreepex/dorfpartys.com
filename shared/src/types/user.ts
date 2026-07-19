import type { UserRole } from '../constants/index.js';

export interface User {
	id: string;
	authentikSubject: string;
	email: string;
	role: UserRole;
	createdAt: string;
}

export interface UserProfile {
	userId: string;
	slug: string | null;
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
