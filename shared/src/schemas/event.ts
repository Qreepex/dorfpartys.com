import { z } from 'zod';
import { EVENT_CATEGORY_SLUGS, GERMAN_STATE_SLUGS } from '../constants.js';

export const eventCategorySchema = z.enum(EVENT_CATEGORY_SLUGS);
export const germanStateSchema = z.enum(GERMAN_STATE_SLUGS);

export const createEventInputSchema = z.object({
	title: z.string().trim().min(3).max(140),
	description: z.string().trim().min(10).max(5000),
	category: eventCategorySchema,
	state: germanStateSchema,
	city: z.string().trim().min(2).max(120),
	address: z.string().trim().min(3).max(200),
	postalCode: z
		.string()
		.trim()
		.regex(/^\d{5}$/, 'Muss eine 5-stellige PLZ sein'),
	startAt: z.string().datetime({ offset: true }),
	endAt: z.string().datetime({ offset: true }).optional(),
	coverImageUrl: z.string().url().optional(),
	websiteUrl: z.string().url().optional(),
	isFree: z.boolean().default(true),
	priceInCents: z.number().int().nonnegative().optional()
});

export type CreateEventInput = z.infer<typeof createEventInputSchema>;

export const eventSearchQuerySchema = z.object({
	q: z.string().trim().max(140).optional(),
	state: germanStateSchema.optional(),
	city: z.string().trim().max(120).optional(),
	category: eventCategorySchema.optional(),
	from: z.string().datetime({ offset: true }).optional(),
	page: z.coerce.number().int().positive().default(1),
	pageSize: z.coerce.number().int().positive().max(100).default(24)
});

export type EventSearchQuery = z.infer<typeof eventSearchQuerySchema>;

export interface EventRecord {
	id: string;
	slug: string;
	title: string;
	description: string;
	category: (typeof EVENT_CATEGORY_SLUGS)[number];
	state: (typeof GERMAN_STATE_SLUGS)[number];
	city: string;
	address: string;
	postalCode: string;
	startAt: string;
	endAt: string | null;
	coverImageUrl: string | null;
	websiteUrl: string | null;
	isFree: boolean;
	priceInCents: number | null;
	viewCount: number;
	organizerName: string;
	createdAt: string;
	updatedAt: string;
}

export interface EventListItem
	extends Pick<
		EventRecord,
		| 'slug'
		| 'title'
		| 'category'
		| 'state'
		| 'city'
		| 'startAt'
		| 'endAt'
		| 'coverImageUrl'
		| 'isFree'
	> {}
