import { SITE_URL } from "@dorfpartys/shared";

export interface EventJsonLdInput {
  title: string;
  description?: string | null;
  // Beide optional (AGENTS.md 5/2: "Quantität über Qualität", startDate/endDate
  // sind keine Pflichtfelder mehr). Google verlangt für gültiges Event-Markup
  // ein `startDate` - fehlt es, geben wir bewusst KEIN Event-JSON-LD aus (siehe
  // buildEventJsonLd unten), statt ein unvollständiges/potenziell als Fehler in
  // der Search Console auftauchendes Objekt zu senden. `endDate` allein ist nur
  // "recommended", nicht "required" - ist nur sie null, wird lediglich die
  // `endDate`-Property weggelassen, der Rest bleibt gültig.
  startDate: Date | null;
  endDate: Date | null;
  addressDescription: string | null;
  organizerName: string;
  organizerUrl?: string | null;
  priceInfo?: string | null;
  url: string;
  photoUrls: string[];
}

/**
 * schema.org/Event JSON-LD für die Event-Detailseite (AGENTS.md Abschnitt 6).
 * Gibt `null` zurück, wenn kein `startDate` vorliegt - ein Event ohne Datum ist
 * laut Googles strukturierten Daten-Richtlinien kein gültiges Event-Objekt
 * (`startDate` ist "required"), ein trotzdem ausgeliefertes JSON-LD würde in der
 * Search Console als Fehler auftauchen statt nur als fehlendes Rich-Result -
 * daher lieber ganz weglassen als ein ungültiges Objekt senden (Aufrufer muss
 * das `null` behandeln, siehe events.ts `getBySlug`).
 */
export function buildEventJsonLd(input: EventJsonLdInput) {
  if (!input.startDate) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: input.title,
    ...(input.description ? { description: input.description } : {}),
    startDate: input.startDate.toISOString(),
    ...(input.endDate ? { endDate: input.endDate.toISOString() } : {}),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: input.addressDescription ?? undefined,
      address: input.addressDescription ?? undefined,
    },
    organizer: {
      "@type": "Organization",
      name: input.organizerName,
      ...(input.organizerUrl
        ? { url: `${SITE_URL}${input.organizerUrl}` }
        : {}),
    },
    ...(input.priceInfo
      ? {
          offers: {
            "@type": "Offer",
            description: input.priceInfo,
            url: `${SITE_URL}${input.url}`,
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
    image: input.photoUrls,
    url: `${SITE_URL}${input.url}`,
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/** BreadcrumbList JSON-LD für Filter- und Event-Seiten (AGENTS.md Abschnitt 6). */
export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}
