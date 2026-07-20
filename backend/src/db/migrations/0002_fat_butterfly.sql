CREATE TYPE "public"."event_claim_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "event_claim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"claimed_by_user_id" uuid NOT NULL,
	"status" "event_claim_status" DEFAULT 'pending' NOT NULL,
	"reason" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "organizer_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "organizer_name" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "organizer_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event_claim" ADD CONSTRAINT "event_claim_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_claim" ADD CONSTRAINT "event_claim_claimed_by_user_id_user_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_claim" ADD CONSTRAINT "event_claim_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_claim_event_pending_idx" ON "event_claim" USING btree ("event_id","claimed_by_user_id");