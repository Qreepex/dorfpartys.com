CREATE TYPE "public"."report_status" AS ENUM('open', 'reviewed', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('normal', 'dmca', 'copyright', 'dsa', 'netzdk', 'netsperrer', 'swisslaw');--> statement-breakpoint
CREATE TABLE "report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "report_type" NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text,
	"url" text NOT NULL,
	"description" text NOT NULL,
	"reporter_email" text,
	"reporter_name" text,
	"country" "country",
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_rate_limit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_address" text NOT NULL,
	"report_count" integer DEFAULT 1 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
