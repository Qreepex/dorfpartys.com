/**
 * Cleanup und Sync der Party-Arten-Tabelle.
 * Löscht alte/unbenutzte Arten und stellt sicher, dass die aktuelle Liste vorhanden ist.
 *
 * Sicher für Production: Löscht nur Arten, die nicht in PARTY_ART_SEED sind.
 * Rückgängig machen: Die gelöschten Arten sind in der DB-Historie / Backups vorhanden.
 *
 * Ausführung:
 *   pnpm --filter backend cleanup-party-arts
 */

import { PARTY_ART_SEED } from "@dorfpartys/shared";
import { db } from "../index.js";
import { partyArt } from "../schema.js";
import { eq, notInArray } from "drizzle-orm";

async function cleanupAndSyncPartyArts() {
  console.log("📋 Starte Party-Arten Cleanup und Sync...\n");

  const currentSlugs = PARTY_ART_SEED.map((art) => art.slug);
  console.log("✓ Aktuelle Party-Arten:", currentSlugs);

  // 1. Alte Arten löschen (nicht in PARTY_ART_SEED)
  const oldArts = await db
    .select({ slug: partyArt.slug })
    .from(partyArt)
    .where(notInArray(partyArt.slug, currentSlugs));

  if (oldArts.length > 0) {
    console.log("\n🗑️  Lösche alte Party-Arten:");
    for (const art of oldArts) {
      console.log(`   - ${art.slug}`);
    }

    const deleteResult = await db
      .delete(partyArt)
      .where(notInArray(partyArt.slug, currentSlugs));

    console.log(`✓ ${oldArts.length} alte Arten gelöscht`);
  } else {
    console.log("\n✓ Keine alten Arten zum Löschen");
  }

  // 2. Neue/aktuelle Arten einfügen oder aktualisieren
  console.log("\n📝 Sync aktuelle Party-Arten:");
  for (const art of PARTY_ART_SEED) {
    await db
      .insert(partyArt)
      .values({
        slug: art.slug,
        name: art.name,
        active: true,
      })
      .onConflictDoUpdate({
        target: partyArt.slug,
        set: {
          name: art.name,
          active: true,
        },
      });
    console.log(`   ✓ ${art.slug} (${art.name})`);
  }

  console.log("\n✅ Cleanup abgeschlossen!");
  console.log(`   Total aktive Arten: ${PARTY_ART_SEED.length}`);
}

cleanupAndSyncPartyArts().catch((error) => {
  console.error("❌ Fehler:", error);
  process.exit(1);
});
