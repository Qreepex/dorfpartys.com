ALTER TYPE "public"."verification_method" ADD VALUE 'invite_code';--> statement-breakpoint
CREATE TABLE "organizer_invite_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"ghost_user_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"used_by_user_id" uuid,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizer_invite_code_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "organizer_invite_code" ADD CONSTRAINT "organizer_invite_code_ghost_user_id_user_id_fk" FOREIGN KEY ("ghost_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_invite_code" ADD CONSTRAINT "organizer_invite_code_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_invite_code" ADD CONSTRAINT "organizer_invite_code_used_by_user_id_user_id_fk" FOREIGN KEY ("used_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;