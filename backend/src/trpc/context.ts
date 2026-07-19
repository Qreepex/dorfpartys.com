import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { db } from "../db/index.js";
import { resolveAuthContext } from "../auth/context.js";

export async function createContext({ req }: CreateFastifyContextOptions) {
  const { user } = await resolveAuthContext(req, db);
  return { db, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
