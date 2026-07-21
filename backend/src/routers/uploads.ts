import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { MAX_AVATAR_DIMENSION } from "@dorfpartys/shared";
import type { FastifyBaseLogger } from "fastify";
import type { Database } from "../db/index.js";
import {
  validateAndSanitizeImage,
  constrainToSquareMax,
  createValidatedImage,
  uploadToS3,
  logS3Error,
  trackPendingUpload,
  discardPendingUpload,
  type ValidatedImage,
} from "../storage/index.js";
import {
  enforceRateLimit,
  getClientIp,
  RATE_LIMITS,
} from "../rate-limit/index.js";
import { protectedProcedure, router } from "../trpc/trpc.js";

const contentTypeSchema = z.enum(["image/jpeg", "image/png"]);
// Kommt als base64-String über tRPC (der Client nutzt httpBatchLink ohne
// Transformer, ein roher Node-`Buffer` würde als JSON zu `{type:'Buffer',
// data:[...]}` degenerieren statt als Buffer-Instanz anzukommen).
const bufferSchema = z
  .string()
  .min(1, "Keine Datei ausgewählt")
  .transform((base64) => Buffer.from(base64, "base64"));

// Abuse-Schutz (Produktvorgabe: "beliebig viele ... Bilder hochladen kann zu
// Abuse führen") - sowohl pro Nutzer als auch pro IP. Gilt für beide
// Upload-Mutationen (Event-Fotos + Profilbild) unter demselben Scope, weil
// beide dieselbe teure Re-Encoding-/S3-Pipeline durchlaufen (AGENTS.md
// Abschnitt 7: presigned Uploads laufen serverseitig über dieses Backend).
const UPLOAD_LIMIT_MESSAGE =
  "Du hast das Limit für Bild-Uploads erreicht. Bitte versuche es später erneut.";

// Der eigentliche S3-PUT ist der einzige Schritt in der Upload-Pipeline, der
// von externer Infrastruktur abhängt (Netzwerk/Credentials/Bucket-Policy) statt
// von der Eingabe des Nutzers - ein Fehler hier ist also kein "Bad Request"
// (die Datei war völlig in Ordnung), sondern ein Server-/Infra-Problem.
// Der AWS SDK liefert bei einer nicht-AWS-konformen Fehlerantwort (z.B. IONOS)
// oft nur einen nichtssagenden `UnknownError` ohne brauchbare Message - der
// darf nicht 1:1 an den Client durchgereicht werden, sondern wird hier mit
// vollem Kontext geloggt (Statuscode, Request-ID) und durch eine generische,
// verständliche Meldung ersetzt.
async function uploadValidatedImage(
  db: Database,
  validatedImage: ValidatedImage,
  uploadedByUserId: string,
  log: FastifyBaseLogger,
): Promise<{ s3Key: string }> {
  try {
    await uploadToS3(
      validatedImage.s3Key,
      validatedImage.buffer,
      validatedImage.mimeType,
    );
  } catch (err) {
    logS3Error(log, err, { s3Key: validatedImage.s3Key }, "S3 upload failed");
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Foto konnte nicht gespeichert werden - das liegt nicht an deiner Datei. Bitte versuch es später erneut.",
    });
  }

  // Als "pending" tracken, bis der Aufrufer den Key an einen echten Datensatz
  // anhängt (Event gespeichert / Avatar gesetzt, siehe `confirmUpload` in
  // users.ts/events.ts) - ein periodischer Sweep löscht alles, was 15 Minuten
  // lang nie bestätigt wird (backend/src/index.ts), damit abgebrochene
  // Formulare keine dauerhaft verwaisten Dateien im Bucket hinterlassen.
  await trackPendingUpload(db, validatedImage.s3Key, uploadedByUserId);

  return { s3Key: validatedImage.s3Key };
}

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

      let validatedImage: ValidatedImage;
      try {
        // Production-grade validation with re-encoding
        const { mimeType, sanitizedBuffer } = await validateAndSanitizeImage(
          input.buffer,
          input.contentType,
        );

        validatedImage = createValidatedImage(
          sanitizedBuffer,
          mimeType,
          input.eventId,
          "event",
        );
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Upload fehlgeschlagen",
        });
      }

      return uploadValidatedImage(ctx.db, validatedImage, ctx.user.id, ctx.req.log);
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

      let validatedImage: ValidatedImage;
      try {
        // Production-grade validation with re-encoding
        const { mimeType, sanitizedBuffer } = await validateAndSanitizeImage(
          input.buffer,
          input.contentType,
        );

        // Erzwingt 128x128 (AGENTS.md Abschnitt 3) unabhängig davon, ob der
        // Client tatsächlich clientseitig runterskaliert hat - die Mutation
        // kann auch direkt angesprochen werden.
        const avatarBuffer = await constrainToSquareMax(
          sanitizedBuffer,
          mimeType,
          MAX_AVATAR_DIMENSION,
        );

        validatedImage = createValidatedImage(
          avatarBuffer,
          mimeType,
          ctx.user.id,
          "profile",
        );
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Upload fehlgeschlagen",
        });
      }

      return uploadValidatedImage(ctx.db, validatedImage, ctx.user.id, ctx.req.log);
    }),

  // Sofort-Löschung eines noch nicht bestätigten Uploads - z.B. wenn im
  // Event-Formular ein gerade hochgeladenes Foto ersetzt oder entfernt wird,
  // bevor überhaupt abgeschickt wurde (siehe PhotoUpload.svelte `onDiscard`).
  // `discardPendingUpload` prüft selbst, dass der Key dem aufrufenden Nutzer
  // gehört und noch nicht bestätigt/angehängt ist.
  discardPendingUpload: protectedProcedure
    .input(z.object({ s3Key: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await discardPendingUpload(ctx.db, input.s3Key, ctx.user.id, ctx.req.log);
      return { success: true };
    }),
});
