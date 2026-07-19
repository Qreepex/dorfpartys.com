CREATE TYPE "public"."country" AS ENUM('de', 'at', 'ch');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'in_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."slug_type" AS ENUM('bundesland', 'kreis', 'party_art', 'monat');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TABLE "bundesland" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"country" "country" NOT NULL,
	CONSTRAINT "bundesland_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text,
	"title" text NOT NULL,
	"organizer_user_id" uuid NOT NULL,
	"description" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"bundesland_id" uuid NOT NULL,
	"kreis_id" uuid NOT NULL,
	"address_description" text NOT NULL,
	"party_art_id" uuid NOT NULL,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"custom_color" text DEFAULT '#ff6b35' NOT NULL,
	"price_info" text,
	"min_age" integer,
	"allows_muttizettel" boolean DEFAULT false,
	"is_outdoor" boolean DEFAULT false,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"url" text NOT NULL,
	"label" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_photo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"s3_key" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kreis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"bundesland_id" uuid NOT NULL,
	CONSTRAINT "kreis_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "party_art" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "party_art_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "slug_registry" (
	"slug" text PRIMARY KEY NOT NULL,
	"type" "slug_type" NOT NULL,
	"entity_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"authentik_subject" text NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_authentik_subject_unique" UNIQUE("authentik_subject"),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"url" text NOT NULL,
	"label" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"slug" text,
	"display_name" text,
	"avatar_s3_key" text,
	"website_url" text,
	"instagram_url" text,
	"bio" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profile_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_organizer_user_id_user_id_fk" FOREIGN KEY ("organizer_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_bundesland_id_bundesland_id_fk" FOREIGN KEY ("bundesland_id") REFERENCES "public"."bundesland"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_kreis_id_kreis_id_fk" FOREIGN KEY ("kreis_id") REFERENCES "public"."kreis"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_party_art_id_party_art_id_fk" FOREIGN KEY ("party_art_id") REFERENCES "public"."party_art"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_link" ADD CONSTRAINT "event_link_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_photo" ADD CONSTRAINT "event_photo_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kreis" ADD CONSTRAINT "kreis_bundesland_id_bundesland_id_fk" FOREIGN KEY ("bundesland_id") REFERENCES "public"."bundesland"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_link" ADD CONSTRAINT "user_link_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_link_event_position_idx" ON "event_link" USING btree ("event_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "event_photo_event_position_idx" ON "event_photo" USING btree ("event_id","position");