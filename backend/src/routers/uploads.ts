import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createPresignedAvatarUpload, createPresignedEventPhotoUpload } from '../storage/index.js';
import { protectedProcedure, router } from '../trpc/trpc.js';

const contentTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp']);
const fileSizeSchema = z.number().int().positive();

export const uploadsRouter = router({
	// Keine Ownership-Prüfung gegen die DB möglich: die Event-ID wird vom
	// Client vor `events.create` generiert (siehe submitEventInputSchema.id),
	// das Event existiert zu diesem Zeitpunkt noch nicht. Der presignte Key
	// allein legt nichts offen/an — erst events.create/update (mit
	// Ownership-Check) macht die Datei über die App sichtbar.
	requestEventPhotoUploadUrl: protectedProcedure
		.input(z.object({ eventId: z.string().uuid(), contentType: contentTypeSchema, fileSizeBytes: fileSizeSchema }))
		.mutation(async ({ input }) => {
			try {
				return await createPresignedEventPhotoUpload(input.eventId, input.contentType, input.fileSizeBytes);
			} catch (err) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: err instanceof Error ? err.message : 'Upload abgelehnt' });
			}
		}),

	requestAvatarUploadUrl: protectedProcedure
		.input(z.object({ contentType: contentTypeSchema, fileSizeBytes: fileSizeSchema }))
		.mutation(async ({ ctx, input }) => {
			try {
				return await createPresignedAvatarUpload(ctx.user.id, input.contentType, input.fileSizeBytes);
			} catch (err) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: err instanceof Error ? err.message : 'Upload abgelehnt' });
			}
		})
});
