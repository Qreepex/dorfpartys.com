/**
 * OG-Image-Generator für Search-Route-Kombinationen.
 * Generiert Social-Media-Preview-Bilder für alle gültigen Filter-Kombinationen.
 *
 * Nutzung: pnpm --filter backend generate-og-images [--test-only]
 *   --test-only: Generiert nur 1 Bild zum Testen
 */

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";
import fs from "fs";
import postgres from "postgres";
import sharp from "sharp";
import { getS3Bucket, getS3Client } from "../storage/s3.js";

config({ path: ".env" });

// Configuration
const TEST_ONLY = process.argv.includes("--test-only");
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;

// S3 Client und Bucket (nutzt zentrale Konfiguration aus storage/s3.ts)
const s3Client = getS3Client();
const S3_BUCKET = getS3Bucket();
const S3_ENDPOINT =
  process.env.S3_ENDPOINT || "https://speicher.dorfpartys.com";

/**
 * Generiert ein OG-Image im dorfpartys.com Design (siehe DESIGN.md)
 * Fokus: Maximale Lesbarkeit auf Twitter/Facebook/WhatsApp-Vorschau
 */
async function generateOgImage(
  title: string,
  subtitle: string,
): Promise<Buffer> {
  // Text-Trunkierung für Lesbarkeit
  const displayTitle = title.length > 25 ? title.slice(0, 22) + "…" : title;
  const displaySubtitle =
    subtitle.length > 65 ? subtitle.slice(0, 62) + "…" : subtitle;

  // Brand-Farben (DESIGN.md 3.1)
  const brandPrimary = "#39E67A"; // Neon-Grün
  const brandSecondary = "#FF4B3E"; // Kräftiges Rot
  const brandTertiary = "#FFD93D"; // Gelb/Gold (Party-Akzent)
  const ink = "#0A0B09"; // Dark Text auf Grün
  const textLight = "#FAFAF5"; // Text Light

  // Generiere pseudo-zufällige Positionen für Konfetti basierend auf Title
  const seed = title.charCodeAt(0) + title.charCodeAt(title.length - 1);
  const pseudoRandom = (index: number) => Math.sin(seed + index) * 0.5 + 0.5;

  // Konfetti-Positionen (oben und unten)
  const confettiElements = Array.from({ length: 12 }).map((_, i) => ({
    x: pseudoRandom(i * 2) * IMAGE_WIDTH,
    y: pseudoRandom(i * 2 + 1) * 120,
    size: 8 + pseudoRandom(i * 3) * 8,
    color: [brandPrimary, brandSecondary, brandTertiary][i % 3],
    rotate: pseudoRandom(i * 4) * 360,
  }));

  const confettiBottomElements = Array.from({ length: 8 }).map((_, i) => ({
    x: pseudoRandom(i * 2 + 100) * IMAGE_WIDTH,
    y: IMAGE_HEIGHT - 100 + pseudoRandom(i * 3) * 100,
    size: 6 + pseudoRandom(i * 4) * 6,
    color: [brandPrimary, brandSecondary, brandTertiary][i % 3],
    rotate: pseudoRandom(i * 5) * 360,
  }));

  const svg = `
    <svg width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0A0B09;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1a1b1a;stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Gradient Background -->
      <rect width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" fill="url(#bgGradient)" />

      <!-- Dekorative Blöcke (oben rechts) -->
      <rect x="950" y="20" width="200" height="5" fill="${brandSecondary}" opacity="0.7" rx="2"/>
      <rect x="950" y="35" width="150" height="5" fill="${brandPrimary}" opacity="0.7" rx="2"/>
      <rect x="950" y="50" width="180" height="5" fill="${brandTertiary}" opacity="0.7" rx="2"/>

      <!-- Konfetti oben -->
      ${confettiElements
        .map(
          (el) =>
            `<rect x="${el.x - el.size / 2}" y="${el.y - el.size / 2}" width="${el.size}" height="${el.size}" fill="${el.color}" opacity="0.8" transform="rotate(${el.rotate} ${el.x} ${el.y})"/>`,
        )
        .join("")}

      <!-- Haupttext-Container mit Hintergrund (größer für Hook-Text) -->
      <rect x="0" y="120" width="${IMAGE_WIDTH}" height="400" fill="${brandPrimary}" />

      <!-- HAUPTTITEL -->
      <text x="60" y="220" font-size="56" font-weight="900" fill="${ink}" font-family="Arial, sans-serif">
        ${escapeXml(displayTitle)}
      </text>

      <!-- Untertitel -->
      <text x="60" y="290" font-size="32" font-weight="500" fill="${ink}" opacity="0.9" font-family="Arial, sans-serif">
        ${escapeXml(displaySubtitle)}
      </text>

      <!-- Hook-Text Mitte unten (in der Box) -->
      <text x="${IMAGE_WIDTH / 2}" y="360" font-size="18" font-weight="500" fill="${ink}" text-anchor="middle" font-family="Arial, sans-serif" opacity="0.75">
        Finde Partys in deiner Region
      </text>

      <!-- Branding-Logo unten links -->
      <circle cx="70" cy="590" r="14" fill="${brandSecondary}"/>
      <circle cx="95" cy="590" r="14" fill="${brandPrimary}"/>
      <circle cx="120" cy="590" r="14" fill="${brandTertiary}"/>

      <!-- Branding-Text unten rechts -->
      <text x="${IMAGE_WIDTH - 60}" y="605" font-size="20" font-weight="600" fill="${textLight}" text-anchor="end" font-family="Arial, sans-serif">
        dorfpartys.com
      </text>

      <!-- Konfetti unten -->
      ${confettiBottomElements
        .map(
          (el) =>
            `<circle cx="${el.x}" cy="${el.y}" r="${el.size}" fill="${el.color}" opacity="0.6"/>`,
        )
        .join("")}
    </svg>
  `;

  return sharp(Buffer.from(svg)).png({ quality: 95 }).toBuffer();
}

/**
 * Escaped XML-spezielle Zeichen in SVG-Text
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Uploaded ein Bild zu S3
 */
async function uploadToS3(s3Key: string, buffer: Buffer): Promise<string> {
  fs.writeFileSync("./" + s3Key.split("/").pop(), buffer);

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: "image/png",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return `${S3_ENDPOINT}/${s3Key}`;
  } catch (err) {
    console.error(`Failed to upload ${s3Key} to S3:`, err);
    throw err;
  }
}

/**
 * Generiert OG-Images für ALLE kanonischen Filter-Kombinationen (AGENTS.md 1.2)
 * Kanonische Reihenfolge: bundesland → kreis → art → monat
 *
 * Mögliche Kombinationen:
 * 1. /land/art/
 * 2. /land/monat/
 * 3. /land/art/monat/
 * 4. /land/bundesland/
 * 5. /land/bundesland/art/
 * 6. /land/bundesland/monat/
 * 7. /land/bundesland/art/monat/
 * 8. /land/bundesland/kreis/
 * 9. /land/bundesland/kreis/art/
 * 10. /land/bundesland/kreis/monat/
 * 11. /land/bundesland/kreis/art/monat/
 */
async function loadCombinationsFromDb(): Promise<
  Array<{ title: string; subtitle: string; slug: string; country: string }>
> {
  const sql = postgres(process.env.DATABASE_URL || "");

  const months = [
    { slug: "januar", name: "Januar" },
    { slug: "februar", name: "Februar" },
    { slug: "maerz", name: "März" },
    { slug: "april", name: "April" },
    { slug: "mai", name: "Mai" },
    { slug: "juni", name: "Juni" },
    { slug: "juli", name: "Juli" },
    { slug: "august", name: "August" },
    { slug: "september", name: "September" },
    { slug: "oktober", name: "Oktober" },
    { slug: "november", name: "November" },
    { slug: "dezember", name: "Dezember" },
  ];

  try {
    const combinations: Array<{
      title: string;
      subtitle: string;
      slug: string;
      country: string;
    }> = [];

    const partyArts =
      await sql`SELECT slug, name FROM party_art WHERE active = true`;
    const bundeslaender =
      await sql`SELECT id, slug, name, country FROM bundesland`;
    const kreise = await sql`SELECT slug, name, bundesland_id FROM kreis`;

    // Map: bundesland_id → kreis[]
    const kreiseByBundesland = new Map<string, any[]>();
    for (const kreis of kreise) {
      if (!kreiseByBundesland.has(kreis.bundesland_id)) {
        kreiseByBundesland.set(kreis.bundesland_id, []);
      }
      kreiseByBundesland.get(kreis.bundesland_id)!.push(kreis);
    }

    // 1. Art allein: /de/schuetzenfeste/
    for (const art of partyArts) {
      for (const country of ["de", "at", "ch"]) {
        combinations.push({
          title: art.name,
          subtitle: `${art.name} im deutschsprachigen Raum`,
          slug: `og-image-${art.slug}-${country}`,
          country,
        });
      }
    }

    // 2. Monat allein: /de/august/
    for (const month of months) {
      for (const country of ["de", "at", "ch"]) {
        combinations.push({
          title: month.name,
          subtitle: `Partys im ${month.name}`,
          slug: `og-image-${month.slug}-${country}`,
          country,
        });
      }
    }

    // 3. Art + Monat: /de/schuetzenfeste/august/
    for (const art of partyArts) {
      for (const month of months) {
        for (const country of ["de", "at", "ch"]) {
          combinations.push({
            title: art.name,
            subtitle: `${art.name} im ${month.name}`,
            slug: `og-image-${art.slug}-${month.slug}-${country}`,
            country,
          });
        }
      }
    }

    // 4. Bundesland: /de/schleswig-holstein/
    for (const bl of bundeslaender) {
      combinations.push({
        title: bl.name,
        subtitle: `Partys in ${bl.name}`,
        slug: `og-image-${bl.slug}-${bl.country}`,
        country: bl.country,
      });
    }

    // 5. Bundesland + Art: /de/schleswig-holstein/schuetzenfeste/
    for (const bl of bundeslaender) {
      for (const art of partyArts) {
        combinations.push({
          title: art.name,
          subtitle: `${art.name} in ${bl.name}`,
          slug: `og-image-${art.slug}-${bl.slug}-${bl.country}`,
          country: bl.country,
        });
      }
    }

    // 6. Bundesland + Monat: /de/schleswig-holstein/august/
    for (const bl of bundeslaender) {
      for (const month of months) {
        combinations.push({
          title: month.name,
          subtitle: `Partys in ${bl.name} im ${month.name}`,
          slug: `og-image-${month.slug}-${bl.slug}-${bl.country}`,
          country: bl.country,
        });
      }
    }

    // 7. Bundesland + Art + Monat: /de/schleswig-holstein/schuetzenfeste/august/
    for (const bl of bundeslaender) {
      for (const art of partyArts) {
        for (const month of months) {
          combinations.push({
            title: art.name,
            subtitle: `${art.name} in ${bl.name} im ${month.name}`,
            slug: `og-image-${art.slug}-${bl.slug}-${month.slug}-${bl.country}`,
            country: bl.country,
          });
        }
      }
    }

    // 8–11. Kreis-Kombinationen (Kreis ist immer an Bundesland gebunden)
    for (const bl of bundeslaender) {
      const blKreise = kreiseByBundesland.get(bl.id) || [];

      for (const kreis of blKreise) {
        // 8. Bundesland + Kreis: /de/schleswig-holstein/ostholstein/
        combinations.push({
          title: kreis.name,
          subtitle: `Partys in ${kreis.name}, ${bl.name}`,
          slug: `og-image-${kreis.slug}-${bl.slug}-${bl.country}`,
          country: bl.country,
        });

        // 9. Bundesland + Kreis + Art: /de/schleswig-holstein/ostholstein/schuetzenfeste/
        for (const art of partyArts) {
          combinations.push({
            title: art.name,
            subtitle: `${art.name} in ${kreis.name}, ${bl.name}`,
            slug: `og-image-${art.slug}-${kreis.slug}-${bl.slug}-${bl.country}`,
            country: bl.country,
          });
        }

        // 10. Bundesland + Kreis + Monat: /de/schleswig-holstein/ostholstein/august/
        for (const month of months) {
          combinations.push({
            title: month.name,
            subtitle: `Partys in ${kreis.name}, ${bl.name} im ${month.name}`,
            slug: `og-image-${month.slug}-${kreis.slug}-${bl.slug}-${bl.country}`,
            country: bl.country,
          });
        }

        // 11. Bundesland + Kreis + Art + Monat: /de/schleswig-holstein/ostholstein/schuetzenfeste/august/
        for (const art of partyArts) {
          for (const month of months) {
            combinations.push({
              title: art.name,
              subtitle: `${art.name} in ${kreis.name}, ${bl.name} im ${month.name}`,
              slug: `og-image-${art.slug}-${kreis.slug}-${month.slug}-${bl.country}`,
              country: bl.country,
            });
          }
        }
      }
    }

    console.log(`📊 ${combinations.length} OG-Image-Kombinationen geladen`);

    await sql.end();
    return combinations.sort((a, b) => b.slug.length - a.slug.length);
  } catch (err) {
    console.error("Failed to load combinations from DB:", err);
    return [];
  }
}

/**
 * Generiert OG-Images für alle gültigen Filter-Kombinationen
 */
async function generateAllOgImages() {
  console.log(
    TEST_ONLY
      ? "🧪 TEST MODE: Generiere nur 1 OG-Image zum Testen"
      : "🎨 Generiere OG-Images für alle Filter-Kombinationen",
  );

  // Lade echte Kombinationen aus DB
  const combinations = await loadCombinationsFromDb();

  if (combinations.length === 0) {
    console.warn("⚠️  Keine Kombinationen in DB gefunden. Nutze Test-Daten...");
    combinations.push({
      title: "Schützenfeste",
      subtitle: "Entdecke Schützenfeste in Deutschland",
      slug: "og-image-schuetzenfeste-de",
      country: "de",
    });
  }

  const imagesToProcess = TEST_ONLY ? combinations.slice(0, 1) : combinations;
  let successCount = 0;
  let failCount = 0;

  console.log(`📊 Verarbeite ${imagesToProcess.length} Kombinationen...\n`);

  for (const combo of imagesToProcess) {
    try {
      console.log(`📸 Generiere: ${combo.title}...`);

      const buffer = await generateOgImage(combo.title, combo.subtitle);
      const s3Key = `og-images/${combo.slug}.png`;

      const url = await uploadToS3(s3Key, buffer);
      console.log(`   ✅ ${url}`);

      successCount++;
    } catch (err) {
      console.error(
        `   ❌ Fehler bei ${combo.title}:`,
        err instanceof Error ? err.message : err,
      );
      failCount++;
    }
  }

  console.log(`\n📊 Zusammenfassung:`);
  console.log(`   ✅ Erfolgreich: ${successCount}`);
  console.log(`   ❌ Fehler: ${failCount}`);
  console.log(
    `\nℹ️  Nutze diese URLs in den Meta-Tags der Filter-Seiten (resolver.resolve() erweitern)`,
  );
}

// Run
generateAllOgImages().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
