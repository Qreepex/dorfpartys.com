import { and, count, eq, sql } from "drizzle-orm";
import { db, queryClient } from "./db/index.js";
import { bundesland, event, kreis, partyArt } from "./db/schema.js";

async function testKreiseCount() {
  // Hamburg ID suchen
  const [hamburg] = await db
    .select()
    .from(bundesland)
    .where(eq(bundesland.slug, "hamburg"))
    .limit(1);

  if (!hamburg) {
    console.error("Hamburg nicht gefunden");
    return;
  }

  console.log("🏙️ Hamburg ID:", hamburg.id);

  // Test 1: Wieviele Events gibt es insgesamt in Hamburg?
  const [totalResult] = await db
    .select({ total: count() })
    .from(event)
    .where(
      and(eq(event.bundeslandId, hamburg.id), eq(event.status, "approved")),
    );

  console.log("📊 Total Events in Hamburg:", totalResult?.total ?? 0);

  // Test 2: Wieviele Kreise gibt es in Hamburg?
  const kreise = await db
    .select()
    .from(kreis)
    .where(eq(kreis.bundeslandId, hamburg.id));

  console.log(
    "🗺️ Kreise in Hamburg:",
    kreise.length,
    kreise.map((k) => k.name),
  );

  // Test 3: Für jeden Kreis, direkt events zählen
  console.log("\n--- Events pro Kreis (direktes Zählen) ---");
  for (const kreis_item of kreise) {
    const [result] = await db
      .select({ count: count() })
      .from(event)
      .where(
        and(
          eq(event.kreisId, kreis_item.id),
          eq(event.bundeslandId, hamburg.id),
          eq(event.status, "approved"),
          sql`${event.endDate} >= now() OR ${event.endDate} >= now() - interval '12 months'`,
        ),
      );
    console.log(`  ${kreis_item.name}: ${result?.count ?? 0}`);
  }

  // Test 4: Mit LEFT JOIN (wie die echte query)
  console.log("\n--- Events pro Kreis (LEFT JOIN) ---");
  const result = await db
    .select({
      kreisSlug: kreis.slug,
      kreisName: kreis.name,
      eventCount: count(event.id),
    })
    .from(kreis)
    .leftJoin(
      event,
      and(
        eq(event.kreisId, kreis.id),
        eq(event.bundeslandId, hamburg.id),
        eq(event.status, "approved"),
        sql`${event.endDate} >= now() OR ${event.endDate} >= now() - interval '12 months'`,
      ),
    )
    .where(eq(kreis.bundeslandId, hamburg.id))
    .groupBy(kreis.id, kreis.slug, kreis.name)
    .orderBy(kreis.name);

  console.log("Query result:");
  console.table(result);

  // Test 5: Kreise OHNE LEFT JOIN zum Debuggen
  console.log("\n--- Kreise (ohne LEFT JOIN) ---");
  const kreiseOnly = await db
    .select()
    .from(kreis)
    .where(eq(kreis.bundeslandId, hamburg.id));
  console.log(kreiseOnly.length, "Kreise gefunden");
}

testKreiseCount()
  .then(async () => {
    console.log("\n✅ Test abgeschlossen");
    await queryClient.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("❌ Fehler:", err);
    await queryClient.end();
    process.exit(1);
  });
