import { TRPCError } from '@trpc/server';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
	COUNTRIES,
	buildCountryRootUrl,
	buildEventUrl,
	reviewEventInputSchema,
	submitEventInputSchema,
	updateEventInputSchema
} from '@dorfpartys/shared';
import { event, eventLink, eventPhoto, kreis, userProfile } from '../db/schema.js';
import { generateUniqueEventSlug } from '../slug/index.js';
import { buildBreadcrumbJsonLd, buildEventJsonLd } from '../seo/index.js';
import { buildPublicStorageUrl, deleteS3Object } from '../storage/index.js';
import { moderatorProcedure, protectedProcedure, publicProcedure, router } from '../trpc/trpc.js';
import type { Database } from '../db/index.js';

async function assertKreisBelongsToBundesland(
	db: Database,
	kreisId: string,
	bundeslandId: string
) {
	const [row] = await db.select({ bundeslandId: kreis.bundeslandId }).from(kreis).where(eq(kreis.id, kreisId));
	if (!row) {
		throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unbekannter Kreis' });
	}
	if (row.bundeslandId !== bundeslandId) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Der gewählte Kreis gehört nicht zum gewählten Bundesland'
		});
	}
}

async function replacePhotosAndLinks(
	db: Database,
	eventId: string,
	photos: Array<{ s3Key: string; position: 1 | 2 | 3 }> | undefined,
	links: Array<{ url: string; label: string; position: 1 | 2 | 3 }> | undefined
) {
	if (photos) {
		const previousPhotos = await db
			.select({ s3Key: eventPhoto.s3Key })
			.from(eventPhoto)
			.where(eq(eventPhoto.eventId, eventId));

		await db.delete(eventPhoto).where(eq(eventPhoto.eventId, eventId));
		if (photos.length > 0) {
			await db
				.insert(eventPhoto)
				.values(photos.map((p) => ({ eventId, s3Key: p.s3Key, position: p.position })));
		}

		// Alte Keys, die nicht in der neuen Auswahl wiederverwendet werden, aktiv
		// aus S3 entfernen — keine verwaisten öffentlichen Dateien (AGENTS.md 7.1).
		const nextKeys = new Set(photos.map((p) => p.s3Key));
		const staleKeys = previousPhotos.map((p) => p.s3Key).filter((key) => !nextKeys.has(key));
		await Promise.all(staleKeys.map((key) => deleteS3Object(key)));
	}
	if (links) {
		await db.delete(eventLink).where(eq(eventLink.eventId, eventId));
		if (links.length > 0) {
			await db
				.insert(eventLink)
				.values(links.map((l) => ({ eventId, url: l.url, label: l.label, position: l.position })));
		}
	}
}

export const eventsRouter = router({
	create: protectedProcedure.input(submitEventInputSchema).mutation(async ({ ctx, input }) => {
		await assertKreisBelongsToBundesland(ctx.db, input.kreisId, input.bundeslandId);

		const [row] = await ctx.db
			.insert(event)
			.values({
				// Vom Client vorab generierte ID, falls Event-Fotos schon vor dem
				// Anlegen unter diesem Pfad hochgeladen wurden (AGENTS.md 7.1).
				...(input.id ? { id: input.id } : {}),
				title: input.title,
				organizerUserId: ctx.user.id,
				description: input.description,
				startDate: new Date(input.startDate),
				endDate: new Date(input.endDate),
				bundeslandId: input.bundeslandId,
				kreisId: input.kreisId,
				addressDescription: input.addressDescription,
				partyArtId: input.partyArtId,
				status: 'draft',
				...(input.customColor ? { customColor: input.customColor } : {}),
				priceInfo: input.priceInfo ?? null,
				minAge: input.minAge ?? null,
				requiresMuttizettel: input.requiresMuttizettel ?? false,
				isOutdoor: input.isOutdoor ?? false,
				tags: input.tags ?? [],
				customFields: input.customFields ?? {},
				createdBy: ctx.user.id
			})
			.returning({ id: event.id });

		await replacePhotosAndLinks(ctx.db, row.id, input.photos, input.links);

		return { id: row.id };
	}),

	update: protectedProcedure.input(updateEventInputSchema).mutation(async ({ ctx, input }) => {
		const [existing] = await ctx.db.select().from(event).where(eq(event.id, input.id));
		if (!existing) {
			throw new TRPCError({ code: 'NOT_FOUND' });
		}
		if (existing.createdBy !== ctx.user.id) {
			throw new TRPCError({ code: 'FORBIDDEN' });
		}

		await assertKreisBelongsToBundesland(ctx.db, input.kreisId, input.bundeslandId);

		// Eine inhaltliche Änderung an einem bereits freigeschalteten Event muss
		// erneut geprüft werden (README: "Jede Einreichung durchläuft eine
		// redaktionelle Prüfung, bevor sie öffentlich sichtbar wird").
		const nextStatus = existing.status === 'approved' ? 'in_review' : existing.status;

		await ctx.db
			.update(event)
			.set({
				title: input.title,
				description: input.description,
				startDate: new Date(input.startDate),
				endDate: new Date(input.endDate),
				bundeslandId: input.bundeslandId,
				kreisId: input.kreisId,
				addressDescription: input.addressDescription,
				partyArtId: input.partyArtId,
				status: nextStatus,
				...(input.customColor ? { customColor: input.customColor } : {}),
				priceInfo: input.priceInfo ?? null,
				minAge: input.minAge ?? null,
				requiresMuttizettel: input.requiresMuttizettel ?? false,
				isOutdoor: input.isOutdoor ?? false,
				tags: input.tags ?? [],
				customFields: input.customFields ?? {},
				updatedAt: new Date()
			})
			.where(eq(event.id, input.id));

		await replacePhotosAndLinks(ctx.db, input.id, input.photos, input.links);

		return { id: input.id };
	}),

	submitForReview: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [existing] = await ctx.db.select().from(event).where(eq(event.id, input.id));
			if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
			if (existing.createdBy !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
			if (existing.status !== 'draft' && existing.status !== 'rejected') {
				throw new TRPCError({ code: 'BAD_REQUEST', message: `Status ist bereits ${existing.status}` });
			}

			await ctx.db.update(event).set({ status: 'in_review', updatedAt: new Date() }).where(eq(event.id, input.id));
			return { id: input.id };
		}),

	listMine: protectedProcedure.query(async ({ ctx }) =>
		ctx.db.select().from(event).where(eq(event.createdBy, ctx.user.id)).orderBy(desc(event.updatedAt))
	),

	getBySlug: publicProcedure
		.input(z.object({ country: z.enum(COUNTRIES), slug: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.select()
				.from(event)
				.where(and(eq(event.slug, input.slug), eq(event.status, 'approved')));
			if (!row || !row.slug) {
				throw new TRPCError({ code: 'NOT_FOUND' });
			}

			const [photos, links, [organizerProfile]] = await Promise.all([
				ctx.db.select().from(eventPhoto).where(eq(eventPhoto.eventId, row.id)).orderBy(eventPhoto.position),
				ctx.db.select().from(eventLink).where(eq(eventLink.eventId, row.id)).orderBy(eventLink.position),
				ctx.db
					.select({ displayName: userProfile.displayName })
					.from(userProfile)
					.where(eq(userProfile.userId, row.organizerUserId))
			]);

			// Ohne gepflegten display_name generischer Platzhalter (AGENTS.md Abschnitt 3).
			const organizerName = organizerProfile?.displayName ?? 'Veranstalter';

			const eventUrl = buildEventUrl(input.country, row.slug);
			const photosWithUrl = photos.map((p) => ({ ...p, url: buildPublicStorageUrl(p.s3Key) }));

			const jsonLd = buildEventJsonLd({
				title: row.title,
				description: row.description,
				startDate: row.startDate,
				endDate: row.endDate,
				addressDescription: row.addressDescription,
				organizerName,
				url: eventUrl,
				photoUrls: photosWithUrl.map((p) => p.url)
			});

			const breadcrumbJsonLd = buildBreadcrumbJsonLd([
				{ name: input.country.toUpperCase(), url: buildCountryRootUrl(input.country) },
				{ name: row.title, url: eventUrl }
			]);

			return { ...row, photos: photosWithUrl, links, organizerName, jsonLd, breadcrumbJsonLd };
		}),

	listInReview: moderatorProcedure.query(async ({ ctx }) =>
		ctx.db.select().from(event).where(eq(event.status, 'in_review')).orderBy(event.updatedAt)
	),

	review: moderatorProcedure.input(reviewEventInputSchema).mutation(async ({ ctx, input }) => {
		const [existing] = await ctx.db.select().from(event).where(eq(event.id, input.id));
		if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

		if (input.decision === 'rejected') {
			await ctx.db
				.update(event)
				.set({ status: 'rejected', updatedAt: new Date() })
				.where(eq(event.id, input.id));
			// Hook für Review-Status-Benachrichtigung an existing.createdBy — bewusst
			// nicht implementiert (AGENTS.md Abschnitt 9).
			return { id: input.id, status: 'rejected' as const };
		}

		const [kreisRow] = await ctx.db.select({ name: kreis.name }).from(kreis).where(eq(kreis.id, existing.kreisId));
		const slug =
			existing.slug ??
			(await generateUniqueEventSlug(ctx.db, existing.title, kreisRow?.name ?? existing.id));

		await ctx.db
			.update(event)
			.set({
				status: 'approved',
				slug,
				approvedBy: ctx.user.id,
				approvedAt: new Date(),
				updatedAt: new Date()
			})
			.where(eq(event.id, input.id));

		// Hook für Review-Status-Benachrichtigung an existing.createdBy — bewusst
		// nicht implementiert (AGENTS.md Abschnitt 9).
		return { id: input.id, status: 'approved' as const, slug };
	})
});
