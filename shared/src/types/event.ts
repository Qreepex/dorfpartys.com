import type { EventStatus } from '../constants/index.js';

export interface Event {
	id: string;
	slug: string | null; // vergeben erst beim Approve (AGENTS.md 1.7/5)
	title: string;
	organizerUserId: string;
	description: string | null;
	// Optional (AGENTS.md 5, "Quantität über Qualität"): nur title/bundesland/
	// kreis/party_art sind Pflicht - startDate kann fehlen (Termin folgt) oder
	// ein Datum ohne Uhrzeit sein, endDate ist unabhängig davon optional.
	startDate: string | null;
	endDate: string | null;
	bundeslandId: string;
	kreisId: string;
	addressDescription: string | null;
	partyArtId: string;
	status: EventStatus;
	customColor: string;

	priceInfo: string | null;
	minAge: number | null;
	allowsMuttizettel: boolean | null;
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
