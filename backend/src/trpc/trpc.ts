import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import type { Context } from "./context.js";

// Surface Zod-Feldfehler strukturiert an den Client (statt nur einer generischen
// "Bad Request"-Message), damit das Frontend gezielte Fehlermeldungen pro
// Formularfeld anzeigen kann, nicht nur einen generischen 500/Fehlertext.
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/** Eingeloggt, beliebige Rolle (AGENTS.md Abschnitt 5: "user"). */
export const protectedProcedure = t.procedure.use(requireUser);

const requireModerator = t.middleware(({ ctx, next }) => {
  if (
    !ctx.user ||
    (ctx.user.role !== "moderator" && ctx.user.role !== "admin")
  ) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/** Review-Dashboard unter /review (AGENTS.md Abschnitt 5: "moderator"/"admin"). */
export const moderatorProcedure = t.procedure.use(requireModerator);
