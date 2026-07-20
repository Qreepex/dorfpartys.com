import { relations, sql } from "drizzle-orm";
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

export const eventClaimStatusEnum = pgEnum("event_claim_status", [
  "pending",
  "approved",
  "rejected",
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
  // Ghost-Accounts (siehe unten, `isGhost`) haben keinen echten Authentik-Login
  // und daher weder Subject noch E-Mail.
  authentikSubject: text("authentik_subject").unique(),
  email: text("email").unique(),
  role: userRoleEnum("role").notNull().default("user"),
  // null = Registrierungs-/Onboarding-Flow nach dem ersten Authentik-Login noch
  // nicht durchlaufen bzw. bewusst übersprungen (siehe auth/callback).
  onboardingCompletedAt: timestamp("onboarding_completed_at", {
    withTimezone: true,
  }),
  // Platzhalter-Account für nicht registrierte Veranstalter (AGENTS.md 5.4/5):
  // beim Eintragen einer Veranstaltung per Freitext-Name angelegt, kann später
  // von einem verifizierten echten Account übernommen werden (account_claim).
  isGhost: boolean("is_ghost").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userProfile = pgTable(
  "user_profile",
  {
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
    // Gesetzt, wenn dieses (Ghost-)Profil per account_claim in ein anderes
    // Profil übernommen wurde. Slug/Profil bleiben als dauerhafter 301-Redirect
    // auf das Zielprofil erhalten (SEO-Werterhalt alter Links).
    mergedIntoUserId: uuid("merged_into_user_id").references(() => user.id),
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
  ],
);

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
  organizerUserId: uuid("organizer_user_id").references(() => user.id),
  // Für Freitext-Veranstalter oder wenn kein User-Profil gewählt wird
  organizerName: text("organizer_name"),
  // Gibt an, ob der aktuelle Veranstalter (User oder Name) verifiziert ist
  organizerVerified: boolean("organizer_verified").notNull().default(false),
  // false solange eine Organizer-Nominierung für ein fremdes, reales Profil
  // aussteht (AGENTS.md 5.3/organizer_nomination) - bei Selbst-Eintrag oder
  // Ghost-Account-Organizer immer true (kein Inhaber, der zustimmen müsste).
  organizerConfirmed: boolean("organizer_confirmed").notNull().default(true),
  // Optional - Werbetexte für Veranstaltungen können urheberrechtlich
  // geschützt sein, Einreicher sollen nicht zum Kopieren fremder Texte
  // gezwungen werden.
  description: text("description"),
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

// Veranstalter-Claims: Wenn ein Event nicht vom Veranstalter selbst eingereicht wurde
// oder der Veranstalter nicht verifiziert ist, können verifizierte Veranstalter das
// Event "claimen" und erhalten nach Moderation die volle Kontrolle.
export const eventClaim = pgTable(
  "event_claim",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    claimedByUserId: uuid("claimed_by_user_id")
      .notNull()
      .references(() => user.id),
    status: eventClaimStatusEnum("status").notNull().default("pending"),
    reason: text("reason"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedBy: uuid("reviewed_by").references(() => user.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [
    // Partiell auf "pending", damit ein abgelehnter/genehmigter Claim keine
    // erneute Anfrage vom selben User blockiert (AGENTS.md 5.4).
    uniqueIndex("event_claim_event_pending_idx")
      .on(t.eventId, t.claimedByUserId)
      .where(sql`${t.status} = 'pending'`),
  ],
);

// Nominierung eines bestehenden, fremden Profils als Veranstalter beim
// Eintragen einer Veranstaltung (AGENTS.md 5.3) - muss vom nominierten Profil
// selbst oder von einem Moderator/Admin bestätigt werden, bevor das Event als
// von diesem Veranstalter angezeigt wird (event.organizer_confirmed).
export const organizerNomination = pgTable(
  "organizer_nomination",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    nominatedUserId: uuid("nominated_user_id")
      .notNull()
      .references(() => user.id),
    nominatedByUserId: uuid("nominated_by_user_id")
      .notNull()
      .references(() => user.id),
    // Anzeigename des Nominierten zum Zeitpunkt der Nominierung - Fallback für
    // event.organizer_name, falls die Nominierung abgelehnt wird.
    nominatedDisplayNameSnapshot: text("nominated_display_name_snapshot"),
    status: eventClaimStatusEnum("status").notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedBy: uuid("reviewed_by").references(() => user.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [
    // Ein Event hat höchstens eine offene Nominierung gleichzeitig.
    uniqueIndex("organizer_nomination_event_pending_idx")
      .on(t.eventId)
      .where(sql`${t.status} = 'pending'`),
  ],
);

// Übernahme eines Ghost-Accounts (nicht registrierter Veranstalter, siehe
// user.is_ghost) durch einen verifizierten, echten Veranstalter (AGENTS.md
// 5/5.4 "Gehört das Profil zu dir?"). Nach Genehmigung werden alle Events des
// Ghost-Accounts auf den übernehmenden Account umgehängt.
export const accountClaim = pgTable(
  "account_claim",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ghostUserId: uuid("ghost_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    claimedByUserId: uuid("claimed_by_user_id")
      .notNull()
      .references(() => user.id),
    status: eventClaimStatusEnum("status").notNull().default("pending"),
    reason: text("reason"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedBy: uuid("reviewed_by").references(() => user.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("account_claim_ghost_pending_idx")
      .on(t.ghostUserId, t.claimedByUserId)
      .where(sql`${t.status} = 'pending'`),
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
  eventClaimsInitiated: many(eventClaim, {
    relationName: "eventClaimsInitiated",
  }),
  eventClaimsReviewed: many(eventClaim, {
    relationName: "eventClaimsReviewed",
  }),
  organizerNominationsReceived: many(organizerNomination, {
    relationName: "organizerNominationsReceived",
  }),
  organizerNominationsInitiated: many(organizerNomination, {
    relationName: "organizerNominationsInitiated",
  }),
  accountClaimsInitiated: many(accountClaim, {
    relationName: "accountClaimsInitiated",
  }),
}));

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, { fields: [userProfile.userId], references: [user.id] }),
  mergedIntoUser: one(user, {
    fields: [userProfile.mergedIntoUserId],
    references: [user.id],
  }),
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
  claims: many(eventClaim),
  organizerNominations: many(organizerNomination),
}));

export const eventPhotoRelations = relations(eventPhoto, ({ one }) => ({
  event: one(event, { fields: [eventPhoto.eventId], references: [event.id] }),
}));

export const eventLinkRelations = relations(eventLink, ({ one }) => ({
  event: one(event, { fields: [eventLink.eventId], references: [event.id] }),
}));

export const eventClaimRelations = relations(eventClaim, ({ one }) => ({
  event: one(event, { fields: [eventClaim.eventId], references: [event.id] }),
  claimedBy: one(user, {
    fields: [eventClaim.claimedByUserId],
    references: [user.id],
    relationName: "eventClaimsInitiated",
  }),
  reviewedByUser: one(user, {
    fields: [eventClaim.reviewedBy],
    references: [user.id],
    relationName: "eventClaimsReviewed",
  }),
}));

export const organizerNominationRelations = relations(
  organizerNomination,
  ({ one }) => ({
    event: one(event, {
      fields: [organizerNomination.eventId],
      references: [event.id],
    }),
    nominatedUser: one(user, {
      fields: [organizerNomination.nominatedUserId],
      references: [user.id],
      relationName: "organizerNominationsReceived",
    }),
    nominatedByUser: one(user, {
      fields: [organizerNomination.nominatedByUserId],
      references: [user.id],
      relationName: "organizerNominationsInitiated",
    }),
    reviewedByUser: one(user, {
      fields: [organizerNomination.reviewedBy],
      references: [user.id],
    }),
  }),
);

export const accountClaimRelations = relations(accountClaim, ({ one }) => ({
  ghostUser: one(user, {
    fields: [accountClaim.ghostUserId],
    references: [user.id],
  }),
  claimedBy: one(user, {
    fields: [accountClaim.claimedByUserId],
    references: [user.id],
    relationName: "accountClaimsInitiated",
  }),
  reviewedByUser: one(user, {
    fields: [accountClaim.reviewedBy],
    references: [user.id],
  }),
}));

export const savedEventRelations = relations(savedEvent, ({ one }) => ({
  user: one(user, { fields: [savedEvent.userId], references: [user.id] }),
  event: one(event, { fields: [savedEvent.eventId], references: [event.id] }),
}));

export const reportRelations = relations(report, ({}) => ({}));
