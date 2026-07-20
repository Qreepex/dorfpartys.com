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
// Veranstalter können sich selbst, andere öffentliche Profile oder einen Freitext-Namen
// angeben (siehe AGENTS.md Abschnitt 5.3 "Organizer-Auswahl").
export const submitEventInputSchema = z
	.object({
		// Vom Client vorab generierte ID (crypto.randomUUID()), damit Event-Fotos
		// schon vor dem eigentlichen Anlegen unter dem endgültigen event_id-Pfad
		// hochgeladen werden können (AGENTS.md 7.1). Optional, damit updateEventInputSchema
		// weiterhin über die separate `id` unten arbeitet.
		id: z.string().uuid().optional(),
		title: z.string().trim().min(3).max(140),
		// Optional - Werbetexte für Veranstaltungen können urheberrechtlich
		// geschützt sein, Einreicher sollen nicht zum Kopieren fremder Texte
		// gezwungen werden. Wenn angegeben, weiterhin eine sinnvolle Mindestlänge.
		description: z.string().trim().min(10).max(5000).optional(),
		// Optional (Produktvorgabe "Quantität über Qualität" - einzige Pflichtfelder
		// sind title/bundeslandId/kreisId/partyArtId, siehe AGENTS.md 5). Ein reiner
		// nullable Timestamp reicht aus: "kein Datum" -> null, "Datum ohne Uhrzeit" ->
		// wird vom Client als Mitternacht gesendet, keine eigene Zeit-Präzisions-
		// Modellierung nötig. `null` statt `undefined`, damit ein bereits gesetztes
		// Datum beim Bearbeiten auch wieder explizit entfernt werden kann (analog
		// zum `links`-Array-Handling in +page.server.ts).
		startDate: z.string().datetime({ offset: true }).nullable(),
		endDate: z.string().datetime({ offset: true }).nullable(),
		bundeslandId: z.string().uuid(),
		kreisId: z.string().uuid(),
		// Optional (siehe startDate-Kommentar oben).
		addressDescription: z.string().trim().min(3).max(300).nullable(),
		partyArtId: z.string().uuid(),
		customColor: hexColorSchema.optional(),

		// Veranstalter-Auswahl: entweder User-ID oder Freitext-Name (aber nicht beide)
		organizerUserId: z.string().uuid().optional(),
		organizerName: z.string().trim().min(1).max(200).optional(),

		priceInfo: z.string().trim().max(200).optional(),
		minAge: z.number().int().nonnegative().max(99).optional(),
		allowsMuttizettel: z.boolean().optional(),
		isOutdoor: z.boolean().optional(),
		tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
		customFields: z.record(z.string(), z.unknown()).optional(),

		photos: z.array(eventPhotoInputSchema).max(MAX_EVENT_PHOTOS).optional(),
		links: z.array(eventLinkInputSchema).max(MAX_EVENT_LINKS).optional()
	})
	.refine(
		(data) =>
			!data.startDate || !data.endDate || new Date(data.endDate) >= new Date(data.startDate),
		{
			message: 'endDate darf nicht vor startDate liegen',
			path: ['endDate']
		}
	)
	.refine((data) => data.organizerUserId || data.organizerName || true, {
		message: 'Veranstalter erforderlich (Profil oder Name)',
		path: ['organizerName']
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
