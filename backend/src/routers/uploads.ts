import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  validateAndSanitizeImage,
  createValidatedImage,
  uploadToS3,
} from "../storage/index.js";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "../rate-limit/index.js";
import { protectedProcedure, router } from "../trpc/trpc.js";

const contentTypeSchema = z.enum(["image/jpeg", "image/png"]);
const bufferSchema = z.instanceof(Buffer);

// Abuse-Schutz (Produktvorgabe: "beliebig viele ... Bilder hochladen kann zu
// Abuse führen") - sowohl pro Nutzer als auch pro IP. Gilt für beide
// Upload-Mutationen (Event-Fotos + Profilbild) unter demselben Scope, weil
// beide dieselbe teure Re-Encoding-/S3-Pipeline durchlaufen (AGENTS.md
// Abschnitt 7: presigned Uploads laufen serverseitig über dieses Backend).
const UPLOAD_LIMIT_MESSAGE =
  "Du hast das Limit für Bild-Uploads erreicht. Bitte versuche es später erneut.";

async function enforceUploadRateLimit(
  db: Parameters<typeof enforceRateLimit>[0],
  req: Parameters<typeof getClientIp>[0],
  userId: string,
) {
  await enforceRateLimit(
    db,
    "upload:user",
    userId,
    RATE_LIMITS.uploadPerUser,
    UPLOAD_LIMIT_MESSAGE,
  );
  await enforceRateLimit(
    db,
    "upload:ip",
    getClientIp(req),
    RATE_LIMITS.uploadPerIp,
    UPLOAD_LIMIT_MESSAGE,
  );
}

export const uploadsRouter = router({
  uploadEventPhoto: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        contentType: contentTypeSchema,
        buffer: bufferSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await enforceUploadRateLimit(ctx.db, ctx.req, ctx.user.id);
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
      await enforceUploadRateLimit(ctx.db, ctx.req, ctx.user.id);
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
