import { eq, and, ne, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db/index.js";
import { user, userProfile } from "../db/schema.js";
import { moderatorProcedure, router } from "../trpc/trpc.js";
import {
  extractInstagramHandle,
  extractTiktokHandle,
} from "../verification/index.js";
import { TRPCError } from "@trpc/server";

export const adminVerificationRouter = router({
  // Liste alle ausstehenden Verifizierungsanfragen
  listPending: moderatorProcedure.query(async ({ ctx }) => {
    const requests = await ctx.db
      .select({
        userId: userProfile.userId,
        displayName: userProfile.displayName,
        slug: userProfile.slug,
        email: user.email,
        verificationCode: userProfile.verificationCode,
        verificationMethod: userProfile.verificationMethod,
        verificationRequestedAt: userProfile.verificationRequestedAt,
        websiteUrl: userProfile.websiteUrl,
        instagramUrl: userProfile.instagramUrl,
        tiktokUrl: userProfile.tiktokUrl,
      })
      .from(userProfile)
      .innerJoin(user, eq(userProfile.userId, user.id))
      .where(
        and(
          isNotNull(userProfile.verificationCode),
          isNull(userProfile.verifiedAt),
        ),
      )
      .orderBy(userProfile.verificationRequestedAt);

    return requests;
  }),

  // Genehmige eine Verifizierungsanfrage
  approve: moderatorProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        method: z.enum(["email", "instagram", "tiktok"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Lade Profil
      const [profile] = await ctx.db
        .select()
        .from(userProfile)
        .where(eq(userProfile.userId, input.userId));

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profil nicht gefunden",
        });
      }

      if (!profile.verificationCode) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Keine Verifizierungsanfrage vorhanden",
        });
      }

      // Extrahiere Handle für Instagram/TikTok
      let handleToVerify: string | null = null;
      if (input.method === "instagram") {
        handleToVerify = profile.instagramUrl
          ? extractInstagramHandle(profile.instagramUrl)
          : null;
        if (!handleToVerify) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Kein gültiges Instagram-URL Format",
          });
        }
      } else if (input.method === "tiktok") {
        handleToVerify = profile.tiktokUrl
          ? extractTiktokHandle(profile.tiktokUrl)
          : null;
        if (!handleToVerify) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Kein gültiges TikTok-URL Format",
          });
        }
      }

      // Konflikt-Bereinigung
      if (input.method === "instagram" && handleToVerify) {
        const conflictUsers = await ctx.db
          .select()
          .from(userProfile)
          .where(
            and(
              eq(userProfile.verifiedInstagramHandle, handleToVerify),
              ne(userProfile.userId, input.userId),
            ),
          );

        for (const conflictUser of conflictUsers) {
          await ctx.db
            .update(userProfile)
            .set({
              verifiedAt: null,
              verificationMethod: null,
              verifiedInstagramHandle: null,
            })
            .where(eq(userProfile.userId, conflictUser.userId));
        }
      } else if (input.method === "tiktok" && handleToVerify) {
        const conflictUsers = await ctx.db
          .select()
          .from(userProfile)
          .where(
            and(
              eq(userProfile.verifiedTiktokHandle, handleToVerify),
              ne(userProfile.userId, input.userId),
            ),
          );

        for (const conflictUser of conflictUsers) {
          await ctx.db
            .update(userProfile)
            .set({
              verifiedAt: null,
              verificationMethod: null,
              verifiedTiktokHandle: null,
            })
            .where(eq(userProfile.userId, conflictUser.userId));
        }
      }

      // Setze User als verifiziert
      const updateData: Record<string, any> = {
        verifiedAt: new Date(),
        verificationMethod: input.method,
        verificationCode: null,
        updatedAt: new Date(),
      };

      if (input.method === "instagram" && handleToVerify) {
        updateData.verifiedInstagramHandle = handleToVerify;
      } else if (input.method === "tiktok" && handleToVerify) {
        updateData.verifiedTiktokHandle = handleToVerify;
      }

      await ctx.db
        .update(userProfile)
        .set(updateData)
        .where(eq(userProfile.userId, input.userId));

      return { success: true };
    }),

  // Lehne eine Verifizierungsanfrage ab (lösche den Code)
  reject: moderatorProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [profile] = await ctx.db
        .select()
        .from(userProfile)
        .where(eq(userProfile.userId, input.userId));

      if (!profile || !profile.verificationCode) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Keine Verifizierungsanfrage zum Ablehnen",
        });
      }

      await ctx.db
        .update(userProfile)
        .set({
          verificationCode: null,
          verificationRequestedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(userProfile.userId, input.userId));

      return { success: true };
    }),
});
