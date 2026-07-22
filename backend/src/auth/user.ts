import { eq } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { user } from "../db/schema.js";
import type { AuthentikClaims } from "./verify.js";
import { mapAuthentikGroupsToRole } from "./roles.js";

/**
 * Verifizierung ist zustandslos (AGENTS.md 5), aber Events/Profile referenzieren
 * einen App-User-Datensatz. Beim ersten Request mit gültigem JWT wird der
 * User-Datensatz angelegt bzw. Email/Rolle aus den aktuellen Claims aktualisiert.
 */
export async function resolveUserFromClaims(
  db: Database,
  claims: AuthentikClaims,
) {
  const role = mapAuthentikGroupsToRole(claims.groups);

  const [row] = await db
    .insert(user)
    .values({ authentikSubject: claims.sub, role })
    .onConflictDoUpdate({
      target: user.authentikSubject,
      set: { role },
    })
    .returning();

  return row;
}

export async function findUserByAuthentikSubject(
  db: Database,
  subject: string,
) {
  const [row] = await db
    .select()
    .from(user)
    .where(eq(user.authentikSubject, subject))
    .limit(1);
  return row;
}
