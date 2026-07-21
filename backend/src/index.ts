import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import "dotenv/config";
import Fastify from "fastify";
import { db, verifyDatabaseConnection } from "./db/index.js";
import { appRouter } from "./routers/index.js";
import { sweepPendingUploads } from "./storage/index.js";
import { createContext } from "./trpc/context.js";

// Type-only Re-Export für den Frontend-Workspace (AGENTS.md Abschnitt 0):
// `import type { AppRouter } from '@dorfpartys/backend'` - kein Laufzeit-Coupling.
export type { AppRouter } from "./routers/index.js";

// Datenbankverbindung vor dem Server-Start überprüfen
await verifyDatabaseConnection();

// maxParamLength angehoben: tRPCs httpBatchLink fügt bei parallelen Queries alle
// Prozedur-Pfade kommagetrennt in einen einzigen dynamischen Route-Parameter
// ein (z.B. für die Landingpage: stats.overview,events.listUpcoming,...) - das
// überschreitet Fastifys Default von 100 Zeichen schnell (FST_ERR_MAX_PARAM_LENGTH).
//
// trustProxy: Das Backend ist nur clusterintern erreichbar (AGENTS.md
// Abschnitt 0/7 - kein Ingress-Pfad, siehe infra/k8s/ingress/ingress.yaml),
// der einzige Aufrufer ist das Frontend. Das Frontend reicht die tatsächliche
// Browser-IP im `x-forwarded-for`-Header durch (frontend/src/lib/trpc-client),
// nachdem es sie selbst primär aus Cloudflares `cf-connecting-ip`-Header
// gelesen hat (frontend/src/hooks.server.ts). Ohne trustProxy würde Fastifys
// `request.ip` stattdessen immer nur die interne Pod-IP des aufrufenden
// Frontend-Replicas liefern - für IP-basiertes Ratelimiting
// (backend/src/rate-limit/index.ts) unbrauchbar, da dadurch alle
// Nutzer:innen hinter demselben Frontend-Pod zusammengefasst würden.
// bodyLimit angehoben: Foto-Uploads (uploads.uploadEventPhoto/uploadAvatarPhoto,
// siehe backend/src/routers/uploads.ts) laufen als base64-String durch den
// tRPC-JSON-Body (der httpBatchLink hat keinen Transformer für rohe Buffer/
// Uint8Array konfiguriert). Base64 hat ~33% Overhead gegenüber den rohen
// Bytes, dazu kommt der tRPC-Batch-JSON-Envelope - ein Bild nahe am eigenen
// Limit (MAX_IMAGE_SIZE_BYTES, aktuell 1MB) überschreitet damit locker
// Fastifys Default-bodyLimit von 1MB (FST_ERR_CTP_BODY_TOO_LARGE, 413).
const app = Fastify({
  logger: true,
  trustProxy: true,
  routerOptions: { maxParamLength: 5000 },
  bodyLimit: 6 * 1024 * 1024,
});

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

// Räumt Uploads auf, die hochgeladen, aber nie an einen echten Datensatz
// angehängt wurden (abgebrochene Event-Einreichungen, Tab geschlossen vor dem
// Speichern, ...) - siehe backend/src/storage/pending-upload.ts. Läuft in
// jedem Replica unabhängig (kein verteilter Lock nötig): ein doppelt
// verarbeiteter Key führt nur zu einem harmlosen No-op-Löschversuch, siehe
// dort. Kein zusätzlicher K8s-CronJob, da hier kein separates Infra-Setup für
// diesen kleinen periodischen Aufräumschritt gerechtfertigt ist.
const PENDING_UPLOAD_SWEEP_INTERVAL_MS = 2 * 60 * 1000;
setInterval(() => {
  sweepPendingUploads(db, app.log).catch((err) => {
    app.log.error({ err }, "Pending-upload sweep failed");
  });
}, PENDING_UPLOAD_SWEEP_INTERVAL_MS);

const port = Number(process.env.PORT ?? 3033);
await app.listen({ port, host: "0.0.0.0" });
