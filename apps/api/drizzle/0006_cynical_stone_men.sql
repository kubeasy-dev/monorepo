CREATE TYPE "public"."cli_event_type" AS ENUM('cli_login', 'cli_setup');--> statement-breakpoint
CREATE TABLE "cli_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"event_type" "cli_event_type" NOT NULL,
	"cli_version" text NOT NULL,
	"os" text NOT NULL,
	"arch" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cli_events" ADD CONSTRAINT "cli_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cli_events_user_id_idx" ON "cli_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cli_events_event_type_idx" ON "cli_events" USING btree ("event_type");