import { z } from 'zod';
import { MAX_EVENT_LINKS, MAX_EVENT_PHOTOS } from '../constants/index.js';

const hexColorSchema = z
	.string()
	.trim()
	.regex(/^#[0-9a-fA-F]{6}$/, 'Muss ein Hex-Farbwert sein, z.B. #ff0000');

export const eventPhotoInputSchema = z.object({
	s3Key: z.string().trim().min(1),
	position: z.union([z.literal(1), z.literal(2), z.literal(3)])
});

export const eventLinkInputSchema = z.object({
	url: z.string().trim().url(),
	label: z.string().trim().min(1).max(60),
	position: z.union([z.literal(1), z.literal(2), z.literal(3)])
});

// Einreichungsformular, siehe AGENTS.md Abschnitt 2 & 5. Slug wird erst beim
// Approve serverseitig vergeben und ist daher hier bewusst nicht Teil des Inputs.
export const submitEventInputSchema = z
	.object({
		// Vom Client vorab generierte ID (crypto.randomUUID()), damit Event-Fotos
		// schon vor dem eigentlichen Anlegen unter dem endgültigen event_id-Pfad
		// hochgeladen werden können (AGENTS.md 7.1). Optional, damit updateEventInputSchema
		// weiterhin über die separate `id` unten arbeitet.
		id: z.string().uuid().optional(),
		title: z.string().trim().min(3).max(140),
		description: z.string().trim().min(10).max(5000),
		startDate: z.string().datetime({ offset: true }),
		endDate: z.string().datetime({ offset: true }),
		bundeslandId: z.string().uuid(),
		kreisId: z.string().uuid(),
		addressDescription: z.string().trim().min(3).max(300),
		partyArtId: z.string().uuid(),
		customColor: hexColorSchema.optional(),

		priceInfo: z.string().trim().max(200).optional(),
		minAge: z.number().int().nonnegative().max(99).optional(),
		requiresMuttizettel: z.boolean().optional(),
		isOutdoor: z.boolean().optional(),
		tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
		customFields: z.record(z.string(), z.unknown()).optional(),

		photos: z.array(eventPhotoInputSchema).max(MAX_EVENT_PHOTOS).optional(),
		links: z.array(eventLinkInputSchema).max(MAX_EVENT_LINKS).optional()
	})
	.refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
		message: 'endDate darf nicht vor startDate liegen',
		path: ['endDate']
	});

export type SubmitEventInput = z.infer<typeof submitEventInputSchema>;

export const updateEventInputSchema = submitEventInputSchema.and(
	z.object({ id: z.string().uuid() })
);

export type UpdateEventInput = z.infer<typeof updateEventInputSchema>;

export const reviewEventInputSchema = z.object({
	id: z.string().uuid(),
	decision: z.enum(['approved', 'rejected'])
});

export type ReviewEventInput = z.infer<typeof reviewEventInputSchema>;
