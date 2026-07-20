import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL ist nicht gesetzt");
}

export const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });
export type Database = typeof db;

/**
 * Überprüft die Datenbankverbindung beim Startup.
 * Wirft einen Error, wenn die Verbindung nicht funktioniert.
 */
export async function verifyDatabaseConnection() {
  try {
    await queryClient`SELECT 1`;
    console.log("✓ Datenbankverbindung erfolgreich");
  } catch (error) {
    console.error("✗ Datenbankverbindung fehlgeschlagen:", error);
    process.exit(1);
  }
}
