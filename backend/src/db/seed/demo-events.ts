import "dotenv/config";
import { eq } from "drizzle-orm";
import {
  generateUniqueEventSlug,
  generateUniqueOrganizerSlug,
} from "../../slug/index.js";
import { db, queryClient } from "../index.js";
import {
  bundesland,
  event,
  eventLink,
  kreis,
  partyArt,
  user,
  userProfile,
} from "../schema.js";

/**
 * Demo-Datensatz für lokale Entwicklung/Tests (AGENTS.md item 4) - legt einen
 * Demo-Veranstalter und 5 bereits freigeschaltete Beispiel-Events an. Setzt
 * voraus, dass `db:seed` (Taxonomie) vorher gelaufen ist. Nicht Teil des
 * Produktions-Deployments, nur manuell über `db:seed:demo` auszuführen.
 */

interface DemoEventInput {
  title: string;
  description: string;
  daysFromNow: number;
  durationHours: number;
  bundeslandSlug: string;
  kreisSlug: string;
  partyArtSlug: string;
  addressDescription: string;
  customColor: string;
  priceInfo?: string;
  minAge?: number;
  allowsMuttizettel?: boolean;
  linkLabel?: string;
  linkUrl?: string;
}

const DEMO_EVENTS: DemoEventInput[] = [
  {
    title: "Schützenfest Steinhorst",
    description:
      "Drei Tage Blasmusik, Festzelt und Vogelschießen mitten im Dorf. Am Samstagabend spielt die Dorfkapelle, am Sonntag zieht der Festumzug durch den Ort.",
    daysFromNow: 21,
    durationHours: 72,
    bundeslandSlug: "schleswig-holstein",
    kreisSlug: "ostholstein",
    partyArtSlug: "schuetzenfeste",
    addressDescription: "Dorfplatz, 23845 Steinhorst",
    customColor: "#39e67a",
    priceInfo: "Eintritt frei, Festzelt 5€ AK",
    linkLabel: "Schützenverein Steinhorst",
    linkUrl: "https://example.org/schuetzenverein-steinhorst",
  },
  {
    title: "Zeltfete am Deich",
    description:
      "Die Jugendfeuerwehr lädt zur großen Zeltfete am Deich: DJ, Bar und Lagerfeuer bis in die Nacht.",
    daysFromNow: 35,
    durationHours: 8,
    bundeslandSlug: "niedersachsen",
    kreisSlug: "ammerland",
    partyArtSlug: "zeltfeten",
    addressDescription: "Deichweg 3, 26160 Bad Zwischenahn",
    customColor: "#ff4b3e",
    priceInfo: "8€ Abendkasse",
    minAge: 16,
    allowsMuttizettel: true,
  },
  {
    title: "Scheunenfete Hofgut Bergmann",
    description:
      "Rustikale Scheunenfete auf dem Hofgut Bergmann mit Live-Band, Strohballen-Lounge und regionalem Bier vom Fass.",
    daysFromNow: 49,
    durationHours: 7,
    bundeslandSlug: "bayern",
    kreisSlug: "miesbach",
    partyArtSlug: "scheunenfeten",
    addressDescription: "Hofgut Bergmann, Bergstraße 12, 83714 Miesbach",
    customColor: "#ffc93d",
    priceInfo: "12€ VVK / 15€ AK",
    minAge: 18,
    linkLabel: "Tickets",
    linkUrl: "https://example.org/hofgut-bergmann-tickets",
  },
  {
    title: "Stoppelfete Wiesenhof",
    description:
      "Traditionelle Stoppelfete direkt nach der Ernte auf dem Wiesenhof - mit Traktor-Corso und Tanz auf dem Stoppelfeld.",
    daysFromNow: 14,
    durationHours: 6,
    bundeslandSlug: "nordrhein-westfalen",
    kreisSlug: "coesfeld",
    partyArtSlug: "stoppelfeten",
    addressDescription: "Wiesenhof, Feldweg 7, 48653 Coesfeld",
    customColor: "#39e67a",
  },
  {
    title: "Bergfest Innsbruck-Land",
    description:
      "Almabtrieb-Party mit Live-Blasmusik, Schuhplattler-Vorführung und Bergkäse-Verkostung für die ganze Familie.",
    daysFromNow: 63,
    durationHours: 10,
    bundeslandSlug: "tirol",
    kreisSlug: "innsbruck-land",
    partyArtSlug: "dorffeste",
    addressDescription: "Dorfplatz, 6094 Axams",
    customColor: "#ff4b3e",
    priceInfo: "Eintritt frei",
  },
];

async function ensureDemoOrganizer(index: number) {
  const authentikSubject = `demo-organizer-${index}`;
  const email = `demo-organizer-${index}@example.dorfpartys.com`;
  const displayName = `Dorfpartys Demo-Team ${index}`;

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.authentikSubject, authentikSubject));

  const userId =
    existing?.id ??
    (
      await db
        .insert(user)
        .values({ authentikSubject, email, role: "user" })
        .returning({ id: user.id })
    )[0].id;

  const [existingProfile] = await db
    .select({ slug: userProfile.slug })
    .from(userProfile)
    .where(eq(userProfile.userId, userId));

  if (!existingProfile) {
    const slug = await generateUniqueOrganizerSlug(db, displayName, userId);
    await db.insert(userProfile).values({
      userId,
      slug,
      displayName,
      isPublic: true,
      bio: "Demo-Veranstalter für Testzwecke - trägt Beispiel-Events auf dorfpartys.com ein.",
    });
  }

  return userId;
}

async function seedDemoEvents() {
  const organizerId = await ensureDemoOrganizer(1);

  for (const demo of DEMO_EVENTS) {
    const [bundeslandRow] = await db
      .select({ id: bundesland.id })
      .from(bundesland)
      .where(eq(bundesland.slug, demo.bundeslandSlug));
    const [kreisRow] = await db
      .select({ id: kreis.id, name: kreis.name })
      .from(kreis)
      .where(eq(kreis.slug, demo.kreisSlug));
    const [partyArtRow] = await db
      .select({ id: partyArt.id })
      .from(partyArt)
      .where(eq(partyArt.slug, demo.partyArtSlug));

    if (!bundeslandRow || !kreisRow || !partyArtRow) {
      console.warn(
        `Überspringe "${demo.title}" - Taxonomie fehlt (${demo.bundeslandSlug}/${demo.kreisSlug}/${demo.partyArtSlug}). Erst "pnpm db:seed" ausführen.`,
      );
      continue;
    }

    const [existing] = await db
      .select({ id: event.id })
      .from(event)
      .where(eq(event.title, demo.title));
    if (existing) {
      continue;
    }

    const startDate = new Date(
      Date.now() + demo.daysFromNow * 24 * 60 * 60 * 1000,
    );
    const endDate = new Date(
      startDate.getTime() + demo.durationHours * 60 * 60 * 1000,
    );
    const slug = await generateUniqueEventSlug(db, demo.title, kreisRow.name);

    const [row] = await db
      .insert(event)
      .values({
        slug,
        title: demo.title,
        organizerUserId: organizerId,
        description: demo.description,
        startDate,
        endDate,
        bundeslandId: bundeslandRow.id,
        kreisId: kreisRow.id,
        addressDescription: demo.addressDescription,
        partyArtId: partyArtRow.id,
        status: "approved",
        customColor: demo.customColor,
        priceInfo: demo.priceInfo ?? null,
        minAge: demo.minAge ?? null,
        allowsMuttizettel: demo.allowsMuttizettel ?? false,
        createdBy: organizerId,
        approvedBy: organizerId,
        approvedAt: new Date(),
      })
      .returning({ id: event.id });

    if (demo.linkLabel && demo.linkUrl) {
      await db.insert(eventLink).values({
        eventId: row.id,
        url: demo.linkUrl,
        label: demo.linkLabel,
        position: 1,
      });
    }

    console.log(
      `Angelegt: ${demo.title} (/${demo.bundeslandSlug === "tirol" ? "at" : "de"}/veranstaltung/${slug}/)`,
    );
  }
}

await seedDemoEvents();
await queryClient.end();

console.log("Demo-Events angelegt.");
