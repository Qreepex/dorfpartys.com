import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  validateAndSanitizeImage,
  createValidatedImage,
  uploadToS3,
} from "../storage/index.js";
import { protectedProcedure, router } from "../trpc/trpc.js";

const contentTypeSchema = z.enum(["image/jpeg", "image/png"]);
const bufferSchema = z.instanceof(Buffer);

export const uploadsRouter = router({
  uploadEventPhoto: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        contentType: contentTypeSchema,
        buffer: bufferSchema,
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Production-grade validation with re-encoding
        const { mimeType, sanitizedBuffer } = await validateAndSanitizeImage(
          input.buffer,
          input.contentType,
        );

        const validatedImage = createValidatedImage(
          sanitizedBuffer,
          mimeType,
          input.eventId,
          "event",
        );

        await uploadToS3(
          validatedImage.s3Key,
          validatedImage.buffer,
          validatedImage.mimeType,
        );

        return { s3Key: validatedImage.s3Key };
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Upload fehlgeschlagen",
        });
      }
    }),

  uploadAvatarPhoto: protectedProcedure
    .input(
      z.object({
        contentType: contentTypeSchema,
        buffer: bufferSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Production-grade validation with re-encoding
        const { mimeType, sanitizedBuffer } = await validateAndSanitizeImage(
          input.buffer,
          input.contentType,
        );

        const validatedImage = createValidatedImage(
          sanitizedBuffer,
          mimeType,
          ctx.user.id,
          "profile",
        );

        await uploadToS3(
          validatedImage.s3Key,
          validatedImage.buffer,
          validatedImage.mimeType,
        );

        return { s3Key: validatedImage.s3Key };
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Upload fehlgeschlagen",
        });
      }
    }),
});
