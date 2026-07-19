import { SITE_URL } from "@dorfpartys/shared";

export interface EventJsonLdInput {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  addressDescription: string;
  organizerName: string;
  url: string;
  photoUrls: string[];
}

/** schema.org/Event JSON-LD für die Event-Detailseite (AGENTS.md Abschnitt 6). */
export function buildEventJsonLd(input: EventJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: input.title,
    description: input.description,
    startDate: input.startDate.toISOString(),
    endDate: input.endDate.toISOString(),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: input.addressDescription,
      address: input.addressDescription,
    },
    organizer: {
      "@type": "Person",
      name: input.organizerName,
    },
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
