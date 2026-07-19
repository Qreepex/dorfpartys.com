import { fileURLToPath } from "node:url";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL ist nicht gesetzt");
}

// Pfad relativ zur eigenen Modul-Location statt process.cwd(), damit es sowohl
// im Dev-Betrieb (tsx auf src/db/migrate.ts) als auch im Container-Image
// (node auf dist/db/migrate.js, siehe backend/scripts/copy-migrations.mjs) trifft.
const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

const migrationClient = postgres(connectionString, { max: 1 });

await migrate(drizzle(migrationClient), { migrationsFolder });
await migrationClient.end();

console.log("Migrations abgeschlossen.");
