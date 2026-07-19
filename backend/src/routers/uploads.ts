import { z } from 'zod';
import { createPresignedUpload } from '../storage/index.js';
import { protectedProcedure, router } from '../trpc/trpc.js';

const requestUploadInputSchema = z.object({
	kind: z.enum(['event-photo', 'avatar']),
	contentType: z.enum(['image/jpeg', 'image/png', 'image/webp'])
});

export const uploadsRouter = router({
	requestUploadUrl: protectedProcedure.input(requestUploadInputSchema).mutation(async ({ ctx, input }) => {
		const prefix = input.kind === 'avatar' ? 'profiles' : 'events';
		return createPresignedUpload(prefix, ctx.user.id, input.contentType);
	})
});
