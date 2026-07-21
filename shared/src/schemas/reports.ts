import { z } from "zod";

export type ReportType =
  | "normal"
  | "dmca"
  | "copyright"
  | "dsa"
  | "netzdk"
  | "netsperrer"
  | "swisslaw"
  | "own_event_takedown";

export type SubjectType = "event" | "user" | "profile";


// Base schema for all reports
const baseReportSchema = z.object({
  type: z.enum([
    "normal",
    "dmca",
    "copyright",
    "dsa",
    "netzdk",
    "netsperrer",
    "swisslaw",
    "own_event_takedown",
  ]),
  subjectType: z.enum(["event", "user", "profile"]),
  subjectId: z.string().uuid().optional().nullable(),
  url: z.string().url().min(1, "URL is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  country: z.enum(["de", "at", "ch"]).optional(),
});

// Normal report - no additional fields required
export const normalReportSchema = baseReportSchema.extend({
  type: z.literal("normal"),
  reporterEmail: z.string().email().optional(),
  reporterName: z.string().optional(),
});

// "Das ist meine Veranstaltung" report - Veranstalter behauptet Inhaber der
// Veranstaltung zu sein und möchte den Eintrag entfernt haben. Bewusst so
// niedrigschwellig wie ein normaler Report gehalten (keine Pflichtfelder,
// kein automatisches Löschen) - die eigentliche Identitätsprüfung erfolgt
// außerhalb des Formulars über Instagram/E-Mail (siehe REPORT_TYPES unten).
export const ownEventTakedownReportSchema = baseReportSchema.extend({
  type: z.literal("own_event_takedown"),
  reporterEmail: z.string().email().optional(),
  reporterName: z.string().optional(),
});

// DMCA report - requires reporter email
export const dmcaReportSchema = baseReportSchema.extend({
  type: z.literal("dmca"),
  reporterEmail: z.string().email("Email is required for DMCA reports"),
  reporterName: z.string().min(1, "Name is required for DMCA reports"),
  copyrightHolder: z.string().min(1, "Copyright holder name is required"),
});

// Copyright report - requires reporter email
export const copyrightReportSchema = baseReportSchema.extend({
  type: z.literal("copyright"),
  reporterEmail: z.string().email("Email is required for copyright reports"),
  reporterName: z.string().min(1, "Name is required for copyright reports"),
  copyrightOwnerName: z.string().min(1, "Copyright owner name is required"),
});

// DSA report (Digital Services Act) - requires reporter email
export const dsaReportSchema = baseReportSchema.extend({
  type: z.literal("dsa"),
  reporterEmail: z.string().email("Email is required for DSA reports"),
  reporterName: z.string().min(1, "Name is required for DSA reports"),
  illegalContentType: z.string().min(1, "Content type must be specified"),
  specificLegalViolation: z.string().min(10, "Please specify the legal violation"),
});

// NetzDG report (German Network Enforcement Act) - requires reporter email
export const netzDGReportSchema = baseReportSchema.extend({
  type: z.literal("netzdk"),
  reporterEmail: z.string().email("Email is required for NetzDG reports"),
  reporterName: z.string().min(1, "Name is required for NetzDG reports"),
  illegalContentCategory: z.enum([
    "hate_speech",
    "defamation",
    "incitement_violence",
    "discrimination",
    "other",
  ]),
  country: z.literal("de"),
});

// NetSperrer report (Austrian) - requires reporter email
export const netSperrerReportSchema = baseReportSchema.extend({
  type: z.literal("netsperrer"),
  reporterEmail: z.string().email("Email is required for NetSperrer reports"),
  reporterName: z.string().min(1, "Name is required for NetSperrer reports"),
  legalBasis: z.string().min(1, "Legal basis must be specified"),
  country: z.literal("at"),
});

// Swiss law report - requires reporter email
export const swissLawReportSchema = baseReportSchema.extend({
  type: z.literal("swisslaw"),
  reporterEmail: z.string().email("Email is required for Swiss law reports"),
  reporterName: z.string().min(1, "Name is required for Swiss law reports"),
  legalBasis: z.string().min(1, "Legal basis must be specified"),
  country: z.literal("ch"),
});

// Discriminated union of all report types
export const submitReportSchema = z.discriminatedUnion("type", [
  normalReportSchema,
  ownEventTakedownReportSchema,
  dmcaReportSchema,
  copyrightReportSchema,
  dsaReportSchema,
  netzDGReportSchema,
  netSperrerReportSchema,
  swissLawReportSchema,
]);

export type SubmitReportInput = z.infer<typeof submitReportSchema>;
export type NormalReportInput = z.infer<typeof normalReportSchema>;
export type OwnEventTakedownReportInput = z.infer<
  typeof ownEventTakedownReportSchema
>;
export type DMCAReportInput = z.infer<typeof dmcaReportSchema>;
export type CopyrightReportInput = z.infer<typeof copyrightReportSchema>;
export type DSAReportInput = z.infer<typeof dsaReportSchema>;
export type NetzDGReportInput = z.infer<typeof netzDGReportSchema>;
export type NetSperrerReportInput = z.infer<typeof netSperrerReportSchema>;
export type SwissLawReportInput = z.infer<typeof swissLawReportSchema>;

// Report type metadata for form rendering
export const REPORT_TYPES = {
  normal: {
    label: "General Report",
    description: "Report spam, inappropriate content, or other violations",
    requiresEmail: false,
    countries: ["de", "at", "ch"],
  },
  own_event_takedown: {
    label: "Das ist meine Veranstaltung – Entfernung beantragen",
    description:
      "Sie sind der Veranstalter und möchten, dass dieser Eintrag entfernt wird",
    requiresEmail: false,
    countries: ["de", "at", "ch"],
  },
  dmca: {
    label: "DMCA Report",
    description: "Report copyrighted content (requires email)",
    requiresEmail: true,
    countries: ["de", "at", "ch"],
  },
  copyright: {
    label: "Copyright Report",
    description: "Report copyright infringement (requires email)",
    requiresEmail: true,
    countries: ["de", "at", "ch"],
  },
  dsa: {
    label: "Digital Services Act (DSA) Report",
    description: "Report illegal content under DSA (requires email)",
    requiresEmail: true,
    countries: ["de", "at", "ch"],
  },
  netzdk: {
    label: "NetzDG Report",
    description: "Report illegal content under German NetzDG (requires email)",
    requiresEmail: true,
    countries: ["de"],
  },
  netsperrer: {
    label: "NetSperrer Report",
    description: "Report illegal content for Austrian blocking list (requires email)",
    requiresEmail: true,
    countries: ["at"],
  },
  swisslaw: {
    label: "Swiss Law Report",
    description: "Report illegal content under Swiss law (requires email)",
    requiresEmail: true,
    countries: ["ch"],
  },
} as const;

export const SUBJECT_TYPES = {
  event: "Event",
  user: "User",
  profile: "User Profile",
} as const;

export const CONTENT_CATEGORIES = {
  hate_speech: "Hate Speech",
  defamation: "Defamation",
  incitement_violence: "Incitement to Violence",
  discrimination: "Discrimination",
  other: "Other",
} as const;
