import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { notification } from "../db/schema.js";
import { protectedProcedure, router } from "../trpc/trpc.js";

// Navbar-Glocke: "als gelesen markieren" LÖSCHT die Zeile (Produktvorgabe,
// siehe backend/src/notifications/index.ts) - es gibt bewusst kein
// read-Boolean, die Existenz einer Zeile IST der ungelesen-Zustand.
export const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: notification.id,
        type: notification.type,
        message: notification.message,
        link: notification.link,
        createdAt: notification.createdAt,
      })
      .from(notification)
      .where(eq(notification.userId, ctx.user.id))
      .orderBy(desc(notification.createdAt));
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .delete(notification)
        .where(
          and(
            eq(notification.id, input.id),
            eq(notification.userId, ctx.user.id),
          ),
        )
        .returning({ id: notification.id });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return { id: row.id };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .delete(notification)
      .where(eq(notification.userId, ctx.user.id));
    return { success: true };
  }),
});
