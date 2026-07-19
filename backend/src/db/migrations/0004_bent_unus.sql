CREATE TYPE "public"."verification_method" AS ENUM('email', 'instagram', 'tiktok');--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "facebook_url" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "tiktok_url" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "verification_method" "verification_method";--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "verification_code" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "verification_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "verified_instagram_handle" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "verified_tiktok_handle" text;--> statement-breakpoint
CREATE UNIQUE INDEX "user_profile_verified_instagram_handle_idx" ON "user_profile" USING btree ("verified_instagram_handle");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profile_verified_tiktok_handle_idx" ON "user_profile" USING btree ("verified_tiktok_handle");