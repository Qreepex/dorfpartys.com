import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import "dotenv/config";
import Fastify from "fastify";
import { appRouter } from "./routers/index.js";
import { createContext } from "./trpc/context.js";

// Type-only Re-Export für den Frontend-Workspace (AGENTS.md Abschnitt 0):
// `import type { AppRouter } from '@dorfpartys/backend'` — kein Laufzeit-Coupling.
export type { AppRouter } from "./routers/index.js";

// maxParamLength angehoben: tRPCs httpBatchLink fügt bei parallelen Queries alle
// Prozedur-Pfade kommagetrennt in einen einzigen dynamischen Route-Parameter
// ein (z.B. für die Landingpage: stats.overview,events.listUpcoming,...) — das
// überschreitet Fastifys Default von 100 Zeichen schnell (FST_ERR_MAX_PARAM_LENGTH).
const app = Fastify({ logger: true, routerOptions: { maxParamLength: 5000 } });

await app.register(cors, { origin: true, credentials: true });
await app.register(cookie, { secret: process.env.SESSION_COOKIE_SECRET });

await app.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext,
  },
});

app.get("/healthz", async () => ({ status: "ok" }));

const port = Number(process.env.PORT ?? 3033);
await app.listen({ port, host: "0.0.0.0" });
