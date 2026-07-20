CREATE TABLE "account_claim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ghost_user_id" uuid NOT NULL,
	"claimed_by_user_id" uuid NOT NULL,
	"status" "event_claim_status" DEFAULT 'pending' NOT NULL,
	"reason" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organizer_nomination" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"nominated_user_id" uuid NOT NULL,
	"nominated_by_user_id" uuid NOT NULL,
	"nominated_display_name_snapshot" text,
	"status" "event_claim_status" DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
DROP INDEX "event_claim_event_pending_idx";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "authentik_subject" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "organizer_confirmed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_ghost" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "merged_into_user_id" uuid;--> statement-breakpoint
ALTER TABLE "account_claim" ADD CONSTRAINT "account_claim_ghost_user_id_user_id_fk" FOREIGN KEY ("ghost_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_claim" ADD CONSTRAINT "account_claim_claimed_by_user_id_user_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_claim" ADD CONSTRAINT "account_claim_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_nomination" ADD CONSTRAINT "organizer_nomination_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_nomination" ADD CONSTRAINT "organizer_nomination_nominated_user_id_user_id_fk" FOREIGN KEY ("nominated_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_nomination" ADD CONSTRAINT "organizer_nomination_nominated_by_user_id_user_id_fk" FOREIGN KEY ("nominated_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_nomination" ADD CONSTRAINT "organizer_nomination_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_claim_ghost_pending_idx" ON "account_claim" USING btree ("ghost_user_id","claimed_by_user_id") WHERE "account_claim"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "organizer_nomination_event_pending_idx" ON "organizer_nomination" USING btree ("event_id") WHERE "organizer_nomination"."status" = 'pending';--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_merged_into_user_id_user_id_fk" FOREIGN KEY ("merged_into_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_claim_event_pending_idx" ON "event_claim" USING btree ("event_id","claimed_by_user_id") WHERE "event_claim"."status" = 'pending';