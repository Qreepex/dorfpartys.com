CREATE TABLE "pending_upload" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"s3_key" text NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pending_upload_s3_key_unique" UNIQUE("s3_key")
);
--> statement-breakpoint
ALTER TABLE "pending_upload" ADD CONSTRAINT "pending_upload_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;