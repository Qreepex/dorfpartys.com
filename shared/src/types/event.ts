import type { EventStatus } from '../constants/index.js';

export interface Event {
	id: string;
	slug: string | null; // vergeben erst beim Approve (AGENTS.md 1.7/5)
	title: string;
	organizerUserId: string;
	description: string | null;
	startDate: string;
	endDate: string;
	bundeslandId: string;
	kreisId: string;
	addressDescription: string;
	partyArtId: string;
	status: EventStatus;
	customColor: string;

	priceInfo: string | null;
	minAge: number | null;
	allowsMuttizettel: boolean | null;
	isOutdoor: boolean | null;
	tags: string[];
	customFields: Record<string, unknown>;

	createdBy: string;
	approvedBy: string | null;
	approvedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface EventPhoto {
	id: string;
	eventId: string;
	s3Key: string;
	position: 1 | 2 | 3;
}

export interface EventLink {
	id: string;
	eventId: string;
	url: string;
	label: string;
	position: 1 | 2 | 3;
}

export interface EventListItem
	extends Pick<
		Event,
		| 'slug'
		| 'title'
		| 'startDate'
		| 'endDate'
		| 'bundeslandId'
		| 'kreisId'
		| 'partyArtId'
		| 'customColor'
	> {
	coverPhotoS3Key: string | null;
	bundeslandName: string;
	kreisName: string;
	partyArtName: string;
}
