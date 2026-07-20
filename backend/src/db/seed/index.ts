import { PARTY_ART_SEED } from "@dorfpartys/shared";
import "dotenv/config";
import { db, queryClient } from "../index.js";
import { bundesland, kreis, partyArt, slugRegistry } from "../schema.js";
import { BUNDESLAND_SEED } from "./data.js";

async function upsertSlugRegistry(
  slug: string,
  type: "bundesland" | "kreis" | "party_art",
  entityId: string,
) {
  await db
    .insert(slugRegistry)
    .values({ slug, type, entityId })
    .onConflictDoNothing({ target: slugRegistry.slug });
}

async function seedTaxonomy() {
  for (const bl of BUNDESLAND_SEED) {
    const [bundeslandRow] = await db
      .insert(bundesland)
      .values({ slug: bl.slug, name: bl.name, country: bl.country })
      .onConflictDoUpdate({
        target: bundesland.slug,
        set: { name: bl.name, country: bl.country },
      })
      .returning({ id: bundesland.id });

    await upsertSlugRegistry(bl.slug, "bundesland", bundeslandRow.id);

    for (const k of bl.kreise) {
      const [kreisRow] = await db
        .insert(kreis)
        .values({ slug: k.slug, name: k.name, bundeslandId: bundeslandRow.id })
        .onConflictDoUpdate({
          target: kreis.slug,
          set: { name: k.name, bundeslandId: bundeslandRow.id },
        })
        .returning({ id: kreis.id });

      await upsertSlugRegistry(k.slug, "kreis", kreisRow.id);
    }
  }

  for (const art of [...PARTY_ART_SEED]) {
    const [artRow] = await db
      .insert(partyArt)
      .values({ slug: art.slug, name: art.name })
      .onConflictDoUpdate({ target: partyArt.slug, set: { name: art.name } })
      .returning({ id: partyArt.id });

    await upsertSlugRegistry(art.slug, "party_art", artRow.id);
  }

  // Monate sind nicht mehr in der Slug-Registry (Phase 2 Refactor).
  // Sie werden nur im Frontend für die Event-Gruppierung genutzt (CLAUDE.md 1.2).
}

await seedTaxonomy();
await queryClient.end();

console.log("Seed abgeschlossen.");
