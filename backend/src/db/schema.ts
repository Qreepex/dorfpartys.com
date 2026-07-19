import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const countryEnum = pgEnum("country", ["de", "at", "ch"]);
export const userRoleEnum = pgEnum("user_role", ["user", "moderator", "admin"]);
export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "in_review",
  "approved",
  "rejected",
]);
export const slugTypeEnum = pgEnum("slug_type", [
  "bundesland",
  "kreis",
  "party_art",
  "monat",
]);

export const reportTypeEnum = pgEnum("report_type", [
  "normal",
  "dmca",
  "copyright",
  "dsa",
  "netzdk",
  "netsperrer",
  "swisslaw",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "open",
  "reviewed",
  "resolved",
]);

export const verificationMethodEnum = pgEnum("verification_method", [
  "email",
  "instagram",
  "tiktok",
]);

// --- Taxonomie / Stammdaten ---------------------------------------------

export const bundesland = pgTable("bundesland", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  country: countryEnum("country").notNull(),
});

export const kreis = pgTable("kreis", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  bundeslandId: uuid("bundesland_id")
    .notNull()
    .references(() => bundesland.id),
});

export const partyArt = pgTable("party_art", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
});

// Zentrale Slug-Registry mit Unique-Constraint über alle vier Vokabulare
// hinweg (AGENTS.md 1.5) - verhindert, dass z.B. ein Kreis- und ein
// Party-Art-Slug kollidieren.
export const slugRegistry = pgTable("slug_registry", {
  slug: text("slug").primaryKey(),
  type: slugTypeEnum("type").notNull(),
  entityId: text("entity_id").notNull(),
});

// --- User ------------------------------------------------------------------

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  authentikSubject: text("authentik_subject").notNull().unique(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("user"),
  // null = Registrierungs-/Onboarding-Flow nach dem ersten Authentik-Login noch
  // nicht durchlaufen bzw. bewusst übersprungen (siehe auth/callback).
  onboardingCompletedAt: timestamp("onboarding_completed_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userProfile = pgTable("user_profile", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  // Veranstalter-Slug für /{country}/veranstalter/{slug}/ - vergeben, sobald
  // ein display_name gesetzt wird; eigener URL-Baum ohne Kollisionsrisiko zu
  // den vier Filter-Vokabularen, analog zu Event-Slugs (AGENTS.md 1.7).
  slug: text("slug").unique(),
  // Standardmäßig privat - öffentliche Sichtbarkeit ist Voraussetzung fürs
  // Eintragen von Veranstaltungen (enforced sowohl im Backend als auch im
  // Frontend, siehe events.create und /veranstaltung-eintragen).
  isPublic: boolean("is_public").notNull().default(false),
  displayName: text("display_name"),
  avatarS3Key: text("avatar_s3_key"),
  websiteUrl: text("website_url"),
  instagramUrl: text("instagram_url"),
  facebookUrl: text("facebook_url"),
  tiktokUrl: text("tiktok_url"),
  bio: text("bio"),
  // Verifizierung (AGENTS.md Abschnitt Veranstalter-Verifizierung):
  // verifiedAt = null: nicht verifiziert
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verificationMethod: verificationMethodEnum("verification_method"),
  verificationCode: text("verification_code"),
  verificationRequestedAt: timestamp("verification_requested_at", {
    withTimezone: true,
  }),
  // Normalisierte Handles (lowercase, @-frei) für Uniqueness-Checks across Users
  verifiedInstagramHandle: text("verified_instagram_handle"),
  verifiedTiktokHandle: text("verified_tiktok_handle"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
(t) => [
  uniqueIndex("user_profile_verified_instagram_handle_idx").on(
    t.verifiedInstagramHandle,
  ),
  uniqueIndex("user_profile_verified_tiktok_handle_idx").on(
    t.verifiedTiktokHandle,
  ),
]);

export const userLink = pgTable("user_link", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  label: text("label").notNull(),
  position: integer("position").notNull(),
});

// --- Event -------------------------------------------------------------

export const event = pgTable("event", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Slug wird erst beim Freischalten im Review vergeben (AGENTS.md 1.7/5).
  slug: text("slug").unique(),
  title: text("title").notNull(),
  organizerUserId: uuid("organizer_user_id")
    .notNull()
    .references(() => user.id),
  description: text("description").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  bundeslandId: uuid("bundesland_id")
    .notNull()
    .references(() => bundesland.id),
  kreisId: uuid("kreis_id")
    .notNull()
    .references(() => kreis.id),
  addressDescription: text("address_description").notNull(),
  partyArtId: uuid("party_art_id")
    .notNull()
    .references(() => partyArt.id),
  status: eventStatusEnum("status").notNull().default("draft"),
  customColor: text("custom_color").notNull().default("#ff6b35"),

  priceInfo: text("price_info"),
  minAge: integer("min_age"),
  allowsMuttizettel: boolean("allows_muttizettel").default(false),
  isOutdoor: boolean("is_outdoor").default(false),
  tags: text("tags").array().notNull().default([]),
  customFields: jsonb("custom_fields").notNull().default({}),

  createdBy: uuid("created_by")
    .notNull()
    .references(() => user.id),
  approvedBy: uuid("approved_by").references(() => user.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const eventPhoto = pgTable(
  "event_photo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    s3Key: text("s3_key").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [
    uniqueIndex("event_photo_event_position_idx").on(t.eventId, t.position),
  ],
);

export const eventLink = pgTable(
  "event_link",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    label: text("label").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [
    uniqueIndex("event_link_event_position_idx").on(t.eventId, t.position),
  ],
);

// Gemerkte/gespeicherte Veranstaltungen, angezeigt unter /partyliste.
export const savedEvent = pgTable(
  "saved_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("saved_event_user_event_idx").on(t.userId, t.eventId)],
);

// --- Reports ---------------------------------------------------------------

export const report = pgTable("report", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: reportTypeEnum("type").notNull(),
  subjectType: text("subject_type").notNull(), // "event" | "user" | "profile"
  subjectId: text("subject_id"), // nullable - for unrelated content reports
  url: text("url").notNull(),
  description: text("description").notNull(),
  reporterEmail: text("reporter_email"), // required for legal types
  reporterName: text("reporter_name"),
  country: countryEnum("country"), // for legal compliance context
  status: reportStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Rate limiting for reports (IP-based)
export const reportRateLimit = pgTable("report_rate_limit", {
  id: uuid("id").primaryKey().defaultRandom(),
  ipAddress: text("ip_address").notNull(),
  reportCount: integer("report_count").notNull().default(1),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

// --- Relations ---------------------------------------------------------

export const bundeslandRelations = relations(bundesland, ({ many }) => ({
  kreise: many(kreis),
  events: many(event),
}));

export const kreisRelations = relations(kreis, ({ one, many }) => ({
  bundesland: one(bundesland, {
    fields: [kreis.bundeslandId],
    references: [bundesland.id],
  }),
  events: many(event),
}));

export const partyArtRelations = relations(partyArt, ({ many }) => ({
  events: many(event),
}));

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(userProfile, {
    fields: [user.id],
    references: [userProfile.userId],
  }),
  links: many(userLink),
  events: many(event, { relationName: "organizer" }),
}));

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, { fields: [userProfile.userId], references: [user.id] }),
}));

export const userLinkRelations = relations(userLink, ({ one }) => ({
  user: one(user, { fields: [userLink.userId], references: [user.id] }),
}));

export const eventRelations = relations(event, ({ one, many }) => ({
  organizer: one(user, {
    fields: [event.organizerUserId],
    references: [user.id],
    relationName: "organizer",
  }),
  bundesland: one(bundesland, {
    fields: [event.bundeslandId],
    references: [bundesland.id],
  }),
  kreis: one(kreis, { fields: [event.kreisId], references: [kreis.id] }),
  partyArt: one(partyArt, {
    fields: [event.partyArtId],
    references: [partyArt.id],
  }),
  photos: many(eventPhoto),
  links: many(eventLink),
}));

export const eventPhotoRelations = relations(eventPhoto, ({ one }) => ({
  event: one(event, { fields: [eventPhoto.eventId], references: [event.id] }),
}));

export const eventLinkRelations = relations(eventLink, ({ one }) => ({
  event: one(event, { fields: [eventLink.eventId], references: [event.id] }),
}));

export const savedEventRelations = relations(savedEvent, ({ one }) => ({
  user: one(user, { fields: [savedEvent.userId], references: [user.id] }),
  event: one(event, { fields: [savedEvent.eventId], references: [event.id] }),
}));

export const reportRelations = relations(report, ({}) => ({}));
