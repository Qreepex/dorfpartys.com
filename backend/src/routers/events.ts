import {
  COUNTRIES,
  buildCountryRootUrl,
  buildEventUrl,
  buildOrganizerUrl,
  reviewEventInputSchema,
  submitEventInputSchema,
  updateEventInputSchema,
} from "@dorfpartys/shared";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db/index.js";
import {
  bundesland as bundeslandTable,
  event,
  eventLink,
  eventPhoto,
  kreis,
  partyArt,
  savedEvent,
  userProfile,
} from "../db/schema.js";
import { buildBreadcrumbJsonLd, buildEventJsonLd } from "../seo/index.js";
import { generateUniqueEventSlug } from "../slug/index.js";
import { buildPublicStorageUrl, deleteS3Object } from "../storage/index.js";
import { sanitizeInput, sanitizeText } from "../sanitization/index.js";
import {
  moderatorProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../trpc/trpc.js";

async function assertKreisBelongsToBundesland(
  db: Database,
  kreisId: string,
  bundeslandId: string,
) {
  const [row] = await db
    .select({ bundeslandId: kreis.bundeslandId })
    .from(kreis)
    .where(eq(kreis.id, kreisId));
  if (!row) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unbekannter Kreis" });
  }
  if (row.bundeslandId !== bundeslandId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Der gewählte Kreis gehört nicht zum gewählten Bundesland",
    });
  }
}

/**
 * Validiert einen Veranstalter (User-ID) und gibt den verifizierten Status zurück.
 * Wirft einen Fehler, wenn der User nicht existiert oder kein öffentliches Profil hat.
 */
async function validateOrganizerUser(
  db: Database,
  organizerUserId: string | null,
): Promise<boolean> {
  if (!organizerUserId) {
    return false;
  }

  const [row] = await db
    .select({
      isPublic: userProfile.isPublic,
      verifiedAt: userProfile.verifiedAt,
    })
    .from(userProfile)
    .where(eq(userProfile.userId, organizerUserId));

  if (!row?.isPublic) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Der ausgewählte Veranstalter hat kein öffentliches Profil",
    });
  }

  return !!row.verifiedAt;
}

/**
 * Sanitiert Event-Input-Daten: entfernt HTML-Tags und gefährliche Zeichen
 */
function sanitizeEventInput(input: Record<string, any>) {
  return {
    ...input,
    title: sanitizeText(input.title),
    description: sanitizeText(input.description),
    addressDescription: sanitizeText(input.addressDescription),
    organizerName: input.organizerName
      ? sanitizeText(input.organizerName)
      : input.organizerName,
    priceInfo: input.priceInfo
      ? sanitizeText(input.priceInfo)
      : input.priceInfo,
    tags: input.tags?.map((tag: string) => sanitizeText(tag)),
    links: input.links?.map((link: any) => ({
      ...link,
      label: sanitizeText(link.label),
      url: link.url, // URLs sind bereits durch Zod validiert
    })),
  };
}

async function replacePhotosAndLinks(
  db: Database,
  eventId: string,
  photos: Array<{ s3Key: string; position: 1 | 2 | 3 }> | undefined,
  links: Array<{ url: string; label: string; position: 1 | 2 | 3 }> | undefined,
) {
  if (photos) {
    const previousPhotos = await db
      .select({ s3Key: eventPhoto.s3Key })
      .from(eventPhoto)
      .where(eq(eventPhoto.eventId, eventId));

    await db.delete(eventPhoto).where(eq(eventPhoto.eventId, eventId));
    if (photos.length > 0) {
      await db.insert(eventPhoto).values(
        photos.map((p) => ({
          eventId,
          s3Key: p.s3Key,
          position: p.position,
        })),
      );
    }

    // Alte Keys, die nicht in der neuen Auswahl wiederverwendet werden, aktiv
    // aus S3 entfernen - keine verwaisten öffentlichen Dateien (AGENTS.md 7.1).
    const nextKeys = new Set(photos.map((p) => p.s3Key));
    const staleKeys = previousPhotos
      .map((p) => p.s3Key)
      .filter((key) => !nextKeys.has(key));
    await Promise.all(staleKeys.map((key) => deleteS3Object(key)));
  }
  if (links) {
    await db.delete(eventLink).where(eq(eventLink.eventId, eventId));
    if (links.length > 0) {
      await db.insert(eventLink).values(
        links.map((l) => ({
          eventId,
          url: l.url,
          label: l.label,
          position: l.position,
        })),
      );
    }
  }
}

export const eventsRouter = router({
  create: protectedProcedure
    .input(submitEventInputSchema)
    .mutation(async ({ ctx, input }) => {
      await assertKreisBelongsToBundesland(
        ctx.db,
        input.kreisId,
        input.bundeslandId,
      );

      const sanitized = sanitizeEventInput(input);

      // Organizer-Validierung und Verifizierungsstatus
      let organizerUserId: string | null = null;
      let organizerName: string | null = null;
      let organizerVerified = false;

      if (input.organizerUserId) {
        organizerUserId = input.organizerUserId;
        organizerVerified = await validateOrganizerUser(
          ctx.db,
          organizerUserId,
        );
      } else if (input.organizerName) {
        organizerName = sanitized.organizerName || null;
        // Freitext-Veranstalter sind nie automatisch verifiziert
        organizerVerified = false;
      } else {
        // Fallback auf den aktuellen Nutzer (wird beim Create vom Frontend normalerweise
        // als organizerUserId übergeben, aber als Sicherheitsmaßnahme hier auch als Fallback)
        organizerUserId = ctx.user.id;
        organizerVerified = await validateOrganizerUser(
          ctx.db,
          organizerUserId,
        );
      }

      const [row] = await ctx.db
        .insert(event)
        .values({
          // Vom Client vorab generierte ID, falls Event-Fotos schon vor dem
          // Anlegen unter diesem Pfad hochgeladen wurden (AGENTS.md 7.1).
          ...(input.id ? { id: input.id } : {}),
          title: sanitized.title,
          organizerUserId,
          organizerName,
          organizerVerified,
          description: sanitized.description,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          bundeslandId: input.bundeslandId,
          kreisId: input.kreisId,
          addressDescription: sanitized.addressDescription,
          partyArtId: input.partyArtId,
          status: "draft",
          ...(input.customColor ? { customColor: input.customColor } : {}),
          priceInfo: sanitized.priceInfo ?? null,
          minAge: input.minAge ?? null,
          allowsMuttizettel: input.allowsMuttizettel ?? false,
          isOutdoor: input.isOutdoor ?? false,
          tags: sanitized.tags ?? [],
          customFields: input.customFields ?? {},
          createdBy: ctx.user.id,
        })
        .returning({ id: event.id });

      await replacePhotosAndLinks(
        ctx.db,
        row.id,
        input.photos,
        sanitized.links,
      );

      return { id: row.id };
    }),

  update: protectedProcedure
    .input(updateEventInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(event)
        .where(eq(event.id, input.id));
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (existing.createdBy !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await assertKreisBelongsToBundesland(
        ctx.db,
        input.kreisId,
        input.bundeslandId,
      );

      const sanitized = sanitizeEventInput(input);

      // Eine inhaltliche Änderung an einem bereits freigeschalteten Event muss
      // erneut geprüft werden (README: "Jede Einreichung durchläuft eine
      // redaktionelle Prüfung, bevor sie öffentlich sichtbar wird").
      const nextStatus =
        existing.status === "approved" ? "in_review" : existing.status;

      await ctx.db
        .update(event)
        .set({
          title: sanitized.title,
          description: sanitized.description,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          bundeslandId: input.bundeslandId,
          kreisId: input.kreisId,
          addressDescription: sanitized.addressDescription,
          partyArtId: input.partyArtId,
          status: nextStatus,
          ...(input.customColor ? { customColor: input.customColor } : {}),
          priceInfo: sanitized.priceInfo ?? null,
          minAge: input.minAge ?? null,
          allowsMuttizettel: input.allowsMuttizettel ?? false,
          isOutdoor: input.isOutdoor ?? false,
          tags: sanitized.tags ?? [],
          customFields: input.customFields ?? {},
          updatedAt: new Date(),
        })
        .where(eq(event.id, input.id));

      await replacePhotosAndLinks(
        ctx.db,
        input.id,
        input.photos,
        sanitized.links,
      );

      return { id: input.id };
    }),

  submitForReview: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(event)
        .where(eq(event.id, input.id));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.createdBy !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      if (existing.status !== "draft" && existing.status !== "rejected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Status ist bereits ${existing.status}`,
        });
      }

      await ctx.db
        .update(event)
        .set({ status: "in_review", updatedAt: new Date() })
        .where(eq(event.id, input.id));
      return { id: input.id };
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: event.id,
        slug: event.slug,
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        bundeslandId: event.bundeslandId,
        kreisId: event.kreisId,
        addressDescription: event.addressDescription,
        partyArtId: event.partyArtId,
        status: event.status,
        customColor: event.customColor,
        priceInfo: event.priceInfo,
        minAge: event.minAge,
        allowsMuttizettel: event.allowsMuttizettel,
        isOutdoor: event.isOutdoor,
        tags: event.tags,
        customFields: event.customFields,
        createdBy: event.createdBy,
        approvedBy: event.approvedBy,
        approvedAt: event.approvedAt,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        organizerUserId: event.organizerUserId,
        bundeslandName: bundeslandTable.name,
        kreisName: kreis.name,
        partyArtName: partyArt.name,
      })
      .from(event)
      .leftJoin(bundeslandTable, eq(event.bundeslandId, bundeslandTable.id))
      .leftJoin(kreis, eq(event.kreisId, kreis.id))
      .leftJoin(partyArt, eq(event.partyArtId, partyArt.id))
      .where(eq(event.createdBy, ctx.user.id))
      .orderBy(desc(event.updatedAt));

    return rows;
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(event)
        .where(eq(event.id, input.id));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (existing.createdBy !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Nur Draft oder Rejected Events dürfen gelöscht werden
      // (Approved Events sollten archiviert, nicht gelöscht werden)
      if (existing.status !== "draft" && existing.status !== "rejected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Nur unveröffentlichte oder abgelehnte Events können gelöscht werden",
        });
      }

      // Alle Fotos aus S3 löschen
      const photos = await ctx.db
        .select({ s3Key: eventPhoto.s3Key })
        .from(eventPhoto)
        .where(eq(eventPhoto.eventId, input.id));

      await Promise.all(photos.map((p) => deleteS3Object(p.s3Key)));

      // Event löschen (cascades: event_photo, event_link, saved_event)
      await ctx.db.delete(event).where(eq(event.id, input.id));

      return { id: input.id };
    }),

  getBySlug: publicProcedure
    .input(z.object({ country: z.enum(COUNTRIES), slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(event)
        .where(and(eq(event.slug, input.slug), eq(event.status, "approved")));
      if (!row || !row.slug) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [photos, links, organizerProfileList, [partyArtRow], isSaved] =
        await Promise.all([
          ctx.db
            .select()
            .from(eventPhoto)
            .where(eq(eventPhoto.eventId, row.id))
            .orderBy(eventPhoto.position),
          ctx.db
            .select()
            .from(eventLink)
            .where(eq(eventLink.eventId, row.id))
            .orderBy(eventLink.position),
          row.organizerUserId
            ? ctx.db
                .select({
                  displayName: userProfile.displayName,
                  slug: userProfile.slug,
                  verifiedAt: userProfile.verifiedAt,
                })
                .from(userProfile)
                .where(eq(userProfile.userId, row.organizerUserId))
            : Promise.resolve([]),
          ctx.db
            .select({ name: partyArt.name })
            .from(partyArt)
            .where(eq(partyArt.id, row.partyArtId)),
          ctx.user
            ? ctx.db
                .select({ id: savedEvent.id })
                .from(savedEvent)
                .where(
                  and(
                    eq(savedEvent.userId, ctx.user.id),
                    eq(savedEvent.eventId, row.id),
                  ),
                )
                .then((rows) => rows.length > 0)
            : Promise.resolve(false),
        ]);

      const [organizerProfile] = organizerProfileList;

      // Organizername (aus User-Profil oder Freitext)
      const organizerName =
        organizerProfile?.displayName ?? row.organizerName ?? "Veranstalter";
      const organizerUrl = organizerProfile?.slug
        ? buildOrganizerUrl(organizerProfile.slug)
        : null;
      const organizerVerified = row.organizerVerified;

      const eventUrl = buildEventUrl(input.country, row.slug);
      const photosWithUrl = photos.map((p) => ({
        ...p,
        url: buildPublicStorageUrl(p.s3Key),
      }));

      const jsonLd = buildEventJsonLd({
        title: row.title,
        description: row.description,
        startDate: row.startDate,
        endDate: row.endDate,
        addressDescription: row.addressDescription,
        organizerName,
        organizerUrl,
        priceInfo: row.priceInfo,
        url: eventUrl,
        photoUrls: photosWithUrl.map((p) => p.url),
      });

      const breadcrumbJsonLd = buildBreadcrumbJsonLd([
        {
          name: input.country.toUpperCase(),
          url: buildCountryRootUrl(input.country),
        },
        { name: row.title, url: eventUrl },
      ]);

      return {
        ...row,
        photos: photosWithUrl,
        links,
        organizerName,
        organizerSlug: organizerProfile?.slug ?? null,
        organizerVerified,
        partyArtName: partyArtRow?.name ?? "",
        isSaved,
        jsonLd,
        breadcrumbJsonLd,
      };
    }),

  // Für die Landingpage-Lineup-Sektion (AGENTS.md item 7) - nächste Termine,
  // optional auf das bevorzugte Land des Nutzers gefiltert (item 3: "Seite
  // fokussiert sich auf das erkannte Land, bis explizit gewechselt wird").
  listUpcoming: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(24).default(6),
        country: z.enum(COUNTRIES).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          slug: event.slug,
          title: event.title,
          startDate: event.startDate,
          endDate: event.endDate,
          customColor: event.customColor,
          country: bundeslandTable.country,
          bundeslandName: bundeslandTable.name,
          kreisName: kreis.name,
          partyArtName: partyArt.name,
        })
        .from(event)
        .innerJoin(bundeslandTable, eq(event.bundeslandId, bundeslandTable.id))
        .innerJoin(kreis, eq(event.kreisId, kreis.id))
        .innerJoin(partyArt, eq(event.partyArtId, partyArt.id))
        .where(
          and(
            eq(event.status, "approved"),
            sql`${event.endDate} >= now()`,
            input.country
              ? eq(bundeslandTable.country, input.country)
              : undefined,
          ),
        )
        .orderBy(event.startDate)
        .limit(input.limit);

      return rows.map((row) => ({
        ...row,
        startDate: row.startDate.toISOString(),
        endDate: row.endDate.toISOString(),
        eventUrl: row.slug ? buildEventUrl(row.country, row.slug) : null,
      }));
    }),

  listInReview: moderatorProcedure.query(async ({ ctx }) =>
    ctx.db
      .select()
      .from(event)
      .where(eq(event.status, "in_review"))
      .orderBy(event.updatedAt),
  ),

  review: moderatorProcedure
    .input(reviewEventInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(event)
        .where(eq(event.id, input.id));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      if (input.decision === "rejected") {
        await ctx.db
          .update(event)
          .set({ status: "rejected", updatedAt: new Date() })
          .where(eq(event.id, input.id));
        // Hook für Review-Status-Benachrichtigung an existing.createdBy - bewusst
        // nicht implementiert (AGENTS.md Abschnitt 9).
        return { id: input.id, status: "rejected" as const };
      }

      const [kreisRow] = await ctx.db
        .select({ name: kreis.name })
        .from(kreis)
        .where(eq(kreis.id, existing.kreisId));
      const slug =
        existing.slug ??
        (await generateUniqueEventSlug(
          ctx.db,
          existing.title,
          kreisRow?.name ?? existing.id,
        ));

      await ctx.db
        .update(event)
        .set({
          status: "approved",
          slug,
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(event.id, input.id));

      // Hook für Review-Status-Benachrichtigung an existing.createdBy - bewusst
      // nicht implementiert (AGENTS.md Abschnitt 9).
      return { id: input.id, status: "approved" as const, slug };
    }),
});
