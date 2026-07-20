import {
  COUNTRIES,
  buildCountryRootUrl,
  buildEventUrl,
  buildFilterUrl,
  buildOrganizerUrl,
  reviewEventInputSchema,
  submitEventInputSchema,
  updateEventInputSchema,
} from "@dorfpartys/shared";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db/index.js";
import {
  bundesland as bundeslandTable,
  event,
  eventLink,
  eventPhoto,
  organizerNomination,
  savedEvent,
  user,
  userProfile,
  kreis,
  partyArt,
} from "../db/schema.js";
import { buildBreadcrumbJsonLd, buildEventJsonLd } from "../seo/index.js";
import {
  generateUniqueEventSlug,
  generateUniqueOrganizerSlug,
} from "../slug/index.js";
import { buildPublicStorageUrl, deleteS3Object } from "../storage/index.js";
import { sanitizeInput, sanitizeText } from "../sanitization/index.js";
import {
  enforceRateLimit,
  getClientIp,
  RATE_LIMITS,
} from "../rate-limit/index.js";
import {
  moderatorProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../trpc/trpc.js";

// Abuse-Schutz (Produktvorgabe: "beliebig viele Veranstaltungen anlegen kann
// zu Abuse führen") - sowohl pro Nutzer als auch pro IP, da ein Nutzer sich
// mit mehreren Accounts anmelden und so ein rein User-basiertes Limit
// umgehen könnte. Siehe backend/src/rate-limit/index.ts für die Limit-Werte.
const EVENT_CREATE_LIMIT_MESSAGE =
  "Du hast das Limit für Veranstaltungs-Einreichungen erreicht. Bitte versuche es später erneut.";

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

type OrganizerResolution = {
  organizerUserId: string;
  organizerName: null;
  organizerVerified: boolean;
  organizerConfirmed: boolean;
  pendingNomination: {
    nominatedUserId: string;
    nominatedDisplayNameSnapshot: string | null;
  } | null;
};

async function loadOrganizerProfile(db: Database, organizerUserId: string) {
  const [row] = await db
    .select({
      isPublic: userProfile.isPublic,
      verifiedAt: userProfile.verifiedAt,
      displayName: userProfile.displayName,
      isGhost: user.isGhost,
    })
    .from(userProfile)
    .innerJoin(user, eq(user.id, userProfile.userId))
    .where(eq(userProfile.userId, organizerUserId));
  return row ?? null;
}

/**
 * Löst die Veranstalter-Auswahl beim Eintragen einer Veranstaltung auf
 * (AGENTS.md 5.3): sich selbst, ein bestehendes Profil (echt oder Ghost) oder
 * ein neuer Ghost-Account für einen bislang nicht registrierten Veranstalter.
 * Bestehende, fremde Profile werden nur vorläufig zugewiesen - die endgültige
 * Bestätigung passiert über organizer_nomination.
 */
async function resolveOrganizerAssignment(
  db: Database,
  currentUserId: string,
  organizerUserId: string | null,
  sanitizedOrganizerName: string | null,
): Promise<OrganizerResolution> {
  if (organizerUserId) {
    const target = await loadOrganizerProfile(db, organizerUserId);
    if (!target?.isPublic) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Der ausgewählte Veranstalter hat kein öffentliches Profil",
      });
    }

    if (organizerUserId === currentUserId) {
      return {
        organizerUserId,
        organizerName: null,
        organizerVerified: !!target.verifiedAt,
        organizerConfirmed: true,
        pendingNomination: null,
      };
    }

    if (target.isGhost) {
      // Ghost-Accounts haben keinen Inhaber, der zustimmen müsste.
      return {
        organizerUserId,
        organizerName: null,
        organizerVerified: false,
        organizerConfirmed: true,
        pendingNomination: null,
      };
    }

    // Fremdes, echtes Profil - muss vom Inhaber oder einem Moderator/Admin
    // bestätigt werden (organizer_nomination), bevor es final ist.
    return {
      organizerUserId,
      organizerName: null,
      organizerVerified: false,
      organizerConfirmed: false,
      pendingNomination: {
        nominatedUserId: organizerUserId,
        nominatedDisplayNameSnapshot: target.displayName ?? null,
      },
    };
  }

  if (sanitizedOrganizerName) {
    // Kein bestehendes Profil ausgewählt - neuen Ghost-Account anlegen
    // (AGENTS.md 5: "quasi ein Ghost Account", claimbar über /veranstalter/{slug}/).
    const [ghost] = await db
      .insert(user)
      .values({
        authentikSubject: null,
        email: null,
        role: "user",
        isGhost: true,
        onboardingCompletedAt: new Date(),
      })
      .returning({ id: user.id });
    const slug = await generateUniqueOrganizerSlug(
      db,
      sanitizedOrganizerName,
      ghost.id,
    );
    await db.insert(userProfile).values({
      userId: ghost.id,
      slug,
      isPublic: true,
      displayName: sanitizedOrganizerName,
    });
    return {
      organizerUserId: ghost.id,
      organizerName: null,
      organizerVerified: false,
      organizerConfirmed: true,
      pendingNomination: null,
    };
  }

  // Kein Input - Fallback auf die einreichende Person selbst.
  const self = await loadOrganizerProfile(db, currentUserId);
  if (!self?.isPublic) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Der ausgewählte Veranstalter hat kein öffentliches Profil",
    });
  }
  return {
    organizerUserId: currentUserId,
    organizerName: null,
    organizerVerified: !!self.verifiedAt,
    organizerConfirmed: true,
    pendingNomination: null,
  };
}

/**
 * Sanitiert Event-Input-Daten: entfernt HTML-Tags und gefährliche Zeichen
 */
function sanitizeEventInput(input: Record<string, any>) {
  return {
    ...input,
    title: sanitizeText(input.title),
    description: input.description ? sanitizeText(input.description) : null,
    addressDescription: input.addressDescription
      ? sanitizeText(input.addressDescription)
      : null,
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
      await enforceRateLimit(
        ctx.db,
        "event_create:user",
        ctx.user.id,
        RATE_LIMITS.eventCreatePerUser,
        EVENT_CREATE_LIMIT_MESSAGE,
      );
      await enforceRateLimit(
        ctx.db,
        "event_create:ip",
        getClientIp(ctx.req),
        RATE_LIMITS.eventCreatePerIp,
        EVENT_CREATE_LIMIT_MESSAGE,
      );

      await assertKreisBelongsToBundesland(
        ctx.db,
        input.kreisId,
        input.bundeslandId,
      );

      const sanitized = sanitizeEventInput(input);

      const organizer = await resolveOrganizerAssignment(
        ctx.db,
        ctx.user.id,
        input.organizerUserId ?? null,
        sanitized.organizerName || null,
      );

      const [row] = await ctx.db
        .insert(event)
        .values({
          // Vom Client vorab generierte ID, falls Event-Fotos schon vor dem
          // Anlegen unter diesem Pfad hochgeladen wurden (AGENTS.md 7.1).
          ...(input.id ? { id: input.id } : {}),
          title: sanitized.title,
          organizerUserId: organizer.organizerUserId,
          organizerName: organizer.organizerName,
          organizerVerified: organizer.organizerVerified,
          organizerConfirmed: organizer.organizerConfirmed,
          description: sanitized.description,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
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

      if (organizer.pendingNomination) {
        await ctx.db.insert(organizerNomination).values({
          eventId: row.id,
          nominatedUserId: organizer.pendingNomination.nominatedUserId,
          nominatedByUserId: ctx.user.id,
          nominatedDisplayNameSnapshot:
            organizer.pendingNomination.nominatedDisplayNameSnapshot,
        });
      }

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
      // Bearbeiten dürfen sowohl die einreichende Person als auch der aktuell
      // hinterlegte Veranstalter (z.B. nach einem genehmigten Claim, AGENTS.md 5.4).
      if (
        existing.createdBy !== ctx.user.id &&
        existing.organizerUserId !== ctx.user.id
      ) {
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
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
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
          // Anders als bei `create`: das Bearbeiten-Formular hat (noch) keine
          // Tags-/Custom-Fields-UI, sendet diese Felder also nie mit. Ohne
          // Fallback auf die bestehenden Werte würde jedes Speichern über das
          // Formular sie stillschweigend auf []/{} zurücksetzen.
          tags: sanitized.tags ?? existing.tags,
          customFields: input.customFields ?? existing.customFields,
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
      // Gleiche Eigentums-Regel wie `update` (AGENTS.md 5.4): nach einem
      // genehmigten Claim darf auch der neue Veranstalter ein zuvor
      // abgelehntes Event erneut zur Prüfung einreichen, nicht nur die
      // ursprünglich einreichende Person.
      if (
        existing.createdBy !== ctx.user.id &&
        existing.organizerUserId !== ctx.user.id
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
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
        country: bundeslandTable.country,
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

      // Gleiche Eigentums-Regel wie `update`/`getForEdit` (AGENTS.md 5.4): die
      // einreichende Person, der aktuell hinterlegte Veranstalter (z.B. nach
      // einem genehmigten Claim) oder ein Moderator/Admin dürfen löschen.
      // Anders als bei `update` wird der Status bewusst NICHT eingeschränkt -
      // Löschen ist eine eindeutige, destruktive Aktion, für die es keinen
      // fachlichen Grund gibt, sie je nach Status zu blockieren. Das ist auch
      // die einzige Möglichkeit für Veranstalter, ein bereits freigeschaltetes
      // oder in Prüfung befindliches Event wieder loszuwerden (u.a. damit sie
      // die Blocker-Prüfung in users.updateMyProfile für "isPublic: false"
      // auflösen können, siehe dort).
      const isOwner =
        existing.createdBy === ctx.user.id ||
        existing.organizerUserId === ctx.user.id;
      const isModerator =
        ctx.user.role === "moderator" || ctx.user.role === "admin";
      if (!isOwner && !isModerator) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Alle Fotos aus S3 löschen
      const photos = await ctx.db
        .select({ s3Key: eventPhoto.s3Key })
        .from(eventPhoto)
        .where(eq(eventPhoto.eventId, input.id));

      await Promise.all(photos.map((p) => deleteS3Object(p.s3Key)));

      // Event löschen (DB-seitige onDelete: "cascade" für event_photo,
      // event_link, event_claim, organizer_nomination, saved_event -
      // backend/src/db/schema.ts)
      await ctx.db.delete(event).where(eq(event.id, input.id));

      return { id: input.id };
    }),

  // Lädt ein Event für die Bearbeitung über /veranstaltung-eintragen?id=
  // (AGENTS.md TODO "Veranstaltung bearbeiten"). Zugriff wie bei `update`: die
  // einreichende Person oder der aktuell hinterlegte Veranstalter.
  getForEdit: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(event)
        .where(eq(event.id, input.id));
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (
        row.createdBy !== ctx.user.id &&
        row.organizerUserId !== ctx.user.id
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [photos, links, organizerProfile] = await Promise.all([
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
              .select({ displayName: userProfile.displayName })
              .from(userProfile)
              .where(eq(userProfile.userId, row.organizerUserId))
              .then((rows) => rows[0] ?? null)
          : Promise.resolve(null),
      ]);

      return {
        ...row,
        startDate: row.startDate ? row.startDate.toISOString() : null,
        endDate: row.endDate ? row.endDate.toISOString() : null,
        photos: photos.map((p) => ({
          ...p,
          url: buildPublicStorageUrl(p.s3Key),
        })),
        links,
        // Für die Vorbefüllung des "Anderes öffentliches Profil"-Suchfelds im
        // Bearbeiten-Formular (frontend/src/routes/veranstaltung-eintragen).
        organizerDisplayName: organizerProfile?.displayName ?? null,
      };
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

      const [photos, links, organizerProfileList, [taxonomyRow], isSaved] =
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
                  avatarS3Key: userProfile.avatarS3Key,
                })
                .from(userProfile)
                .where(eq(userProfile.userId, row.organizerUserId))
            : Promise.resolve([]),
          ctx.db
            .select({
              bundeslandSlug: bundeslandTable.slug,
              bundeslandName: bundeslandTable.name,
              kreisSlug: kreis.slug,
              kreisName: kreis.name,
              partyArtSlug: partyArt.slug,
              partyArtName: partyArt.name,
            })
            .from(partyArt)
            .innerJoin(
              bundeslandTable,
              eq(bundeslandTable.id, row.bundeslandId),
            )
            .innerJoin(kreis, eq(kreis.id, row.kreisId))
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
      const organizerAvatarUrl = organizerProfile?.avatarS3Key
        ? buildPublicStorageUrl(organizerProfile.avatarS3Key)
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
        ...(taxonomyRow
          ? [
              {
                name: taxonomyRow.bundeslandName,
                url: buildFilterUrl(input.country, {
                  bundeslandSlug: taxonomyRow.bundeslandSlug,
                }),
              },
              {
                name: taxonomyRow.kreisName,
                url: buildFilterUrl(input.country, {
                  bundeslandSlug: taxonomyRow.bundeslandSlug,
                  kreisSlug: taxonomyRow.kreisSlug,
                }),
              },
              {
                name: taxonomyRow.partyArtName,
                url: buildFilterUrl(input.country, {
                  bundeslandSlug: taxonomyRow.bundeslandSlug,
                  kreisSlug: taxonomyRow.kreisSlug,
                  artSlug: taxonomyRow.partyArtSlug,
                }),
              },
            ]
          : []),
        { name: row.title, url: eventUrl },
      ]);

      return {
        ...row,
        photos: photosWithUrl,
        links,
        organizerName,
        organizerSlug: organizerProfile?.slug ?? null,
        organizerAvatarUrl,
        organizerVerified,
        partyArtName: taxonomyRow?.partyArtName ?? "",
        bundeslandSlug: taxonomyRow?.bundeslandSlug ?? null,
        bundeslandName: taxonomyRow?.bundeslandName ?? null,
        kreisSlug: taxonomyRow?.kreisSlug ?? null,
        kreisName: taxonomyRow?.kreisName ?? null,
        partyArtSlug: taxonomyRow?.partyArtSlug ?? null,
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
            // Dateless Events (startDate = null, AGENTS.md 5 "Quantität über
            // Qualität") werden hier bewusst ausgeschlossen - diese Lineup-Sektion
            // ist explizit "nächste Termine, chronologisch sortiert", ein Event
            // ohne Datum lässt sich nicht sinnvoll einsortieren (siehe die eigene
            // "Ohne festen Termin"-Sektion auf den Filter-Seiten stattdessen,
            // frontend [country]/[...segments]). Fehlt nur endDate, gilt das Event
            // trotzdem als "vorbei", sobald startDate in der Vergangenheit liegt
            // (COALESCE-Fallback, identisch zur Logik in resolver/event-date-filters.ts).
            sql`${event.startDate} IS NOT NULL AND COALESCE(${event.endDate}, ${event.startDate}) >= now()`,
            input.country
              ? eq(bundeslandTable.country, input.country)
              : undefined,
          ),
        )
        .orderBy(event.startDate)
        .limit(input.limit);

      return rows.map((row) => ({
        ...row,
        // startDate ist durch die WHERE-Bedingung oben garantiert nicht null.
        startDate: row.startDate!.toISOString(),
        endDate: row.endDate ? row.endDate.toISOString() : null,
        eventUrl: row.slug ? buildEventUrl(row.country, row.slug) : null,
      }));
    }),

  // Liefert alle zur Prüfung anstehenden Events inkl. aller für eine
  // informierte Entscheidung nötigen Detaildaten (Taxonomie-Klarnamen,
  // Veranstalter-Profil, Fotos, Links) - das Review-Dashboard soll den
  // Moderator/innen einen vollständigen Blick auf das Event geben, ohne dass
  // dafür manuell in der DB nachgeschaut werden muss.
  listInReview: moderatorProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: event.id,
        slug: event.slug,
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        addressDescription: event.addressDescription,
        status: event.status,
        customColor: event.customColor,
        priceInfo: event.priceInfo,
        minAge: event.minAge,
        allowsMuttizettel: event.allowsMuttizettel,
        isOutdoor: event.isOutdoor,
        tags: event.tags,
        customFields: event.customFields,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        organizerUserId: event.organizerUserId,
        organizerName: event.organizerName,
        organizerVerified: event.organizerVerified,
        organizerConfirmed: event.organizerConfirmed,
        bundeslandName: bundeslandTable.name,
        kreisName: kreis.name,
        partyArtName: partyArt.name,
        organizerDisplayName: userProfile.displayName,
        organizerSlug: userProfile.slug,
        organizerProfileVerifiedAt: userProfile.verifiedAt,
      })
      .from(event)
      .leftJoin(bundeslandTable, eq(event.bundeslandId, bundeslandTable.id))
      .leftJoin(kreis, eq(event.kreisId, kreis.id))
      .leftJoin(partyArt, eq(event.partyArtId, partyArt.id))
      .leftJoin(userProfile, eq(event.organizerUserId, userProfile.userId))
      .where(eq(event.status, "in_review"))
      .orderBy(event.updatedAt);

    if (rows.length === 0) return [];

    const eventIds = rows.map((r) => r.id);
    const [photos, links] = await Promise.all([
      ctx.db
        .select()
        .from(eventPhoto)
        .where(inArray(eventPhoto.eventId, eventIds))
        .orderBy(eventPhoto.position),
      ctx.db
        .select()
        .from(eventLink)
        .where(inArray(eventLink.eventId, eventIds))
        .orderBy(eventLink.position),
    ]);

    const photosByEvent = new Map<string, typeof photos>();
    for (const photo of photos) {
      const list = photosByEvent.get(photo.eventId) ?? [];
      list.push(photo);
      photosByEvent.set(photo.eventId, list);
    }
    const linksByEvent = new Map<string, typeof links>();
    for (const link of links) {
      const list = linksByEvent.get(link.eventId) ?? [];
      list.push(link);
      linksByEvent.set(link.eventId, list);
    }

    return rows.map((row) => ({
      ...row,
      organizerDisplayName: row.organizerDisplayName ?? row.organizerName,
      photos: (photosByEvent.get(row.id) ?? []).map((p) => ({
        ...p,
        url: buildPublicStorageUrl(p.s3Key),
      })),
      links: linksByEvent.get(row.id) ?? [],
    }));
  }),

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
