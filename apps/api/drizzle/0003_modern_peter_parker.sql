CREATE TABLE "challenge_metadata" (
	"slug" text PRIMARY KEY NOT NULL,
	"of_the_week" boolean DEFAULT false NOT NULL,
	"starter_friendly" boolean DEFAULT false NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Seed from challenge table before dropping it
INSERT INTO "challenge_metadata" ("slug", "of_the_week", "starter_friendly", "available", "created_at", "updated_at")
SELECT "slug", "of_the_week", "starter_friendly", "available", "created_at", "updated_at"
FROM "challenge";
--> statement-breakpoint
-- Add challenge_slug as nullable so backfill can run before NOT NULL
ALTER TABLE "user_progress" ADD COLUMN "challenge_slug" text;
--> statement-breakpoint
ALTER TABLE "user_submission" ADD COLUMN "challenge_slug" text;
--> statement-breakpoint
ALTER TABLE "user_xp_transaction" ADD COLUMN "challenge_slug" text;
--> statement-breakpoint
-- Backfill challenge_slug from challenge table
UPDATE "user_progress" SET "challenge_slug" = c.slug FROM "challenge" c WHERE c.id = "user_progress"."challenge_id";
--> statement-breakpoint
UPDATE "user_submission" SET "challenge_slug" = c.slug FROM "challenge" c WHERE c.id = "user_submission"."challenge_id";
--> statement-breakpoint
UPDATE "user_xp_transaction" SET "challenge_slug" = c.slug FROM "challenge" c WHERE c.id = "user_xp_transaction"."challenge_id";
--> statement-breakpoint
-- Rename id -> key and name -> title in objectives JSON array
UPDATE "user_submission"
SET "objectives" = (
    SELECT json_agg(
        json_build_object(
            'key', obj->>'id',
            'title', obj->>'name',
            'description', obj->'description',
            'passed', (obj->>'passed')::boolean,
            'category', obj->'category',
            'message', obj->'message'
        )
    )
    FROM json_array_elements("objectives") AS obj
)
WHERE "objectives" IS NOT NULL 
  AND json_array_length("objectives") > 0
  AND "objectives"->0->>'id' IS NOT NULL;
--> statement-breakpoint
-- Enforce NOT NULL now that all rows are backfilled (xp_transaction stays nullable)
ALTER TABLE "user_progress" ALTER COLUMN "challenge_slug" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_submission" ALTER COLUMN "challenge_slug" SET NOT NULL;
--> statement-breakpoint
-- Drop old indexes on user_progress (they reference challenge_id)
DROP INDEX "user_progress_user_challenge_unique_idx";
--> statement-breakpoint
DROP INDEX "user_progress_user_status_challenge_idx";
--> statement-breakpoint
DROP INDEX "user_progress_challenge_status_idx";
--> statement-breakpoint
-- Drop FK constraints before dropping the challenge table
ALTER TABLE "user_progress" DROP CONSTRAINT "user_progress_challenge_id_challenge_id_fk";
--> statement-breakpoint
ALTER TABLE "user_submission" DROP CONSTRAINT "user_submission_challenge_id_challenge_id_fk";
--> statement-breakpoint
ALTER TABLE "user_xp_transaction" DROP CONSTRAINT "user_xp_transaction_challenge_id_challenge_id_fk";
--> statement-breakpoint
ALTER TABLE "user_submission" ALTER COLUMN "attempt_number" SET NOT NULL;
--> statement-breakpoint
-- Drop challenge_objective first (it has a FK referencing challenge)
ALTER TABLE "challenge_objective" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP TABLE "challenge_objective";
--> statement-breakpoint
ALTER TABLE "challenge" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP TABLE "challenge";
--> statement-breakpoint
ALTER TABLE "challenge_theme" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP TABLE "challenge_theme";
--> statement-breakpoint
ALTER TABLE "challenge_type" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP TABLE "challenge_type";
--> statement-breakpoint
-- Drop old challenge_id columns
ALTER TABLE "user_progress" DROP COLUMN "challenge_id";
--> statement-breakpoint
ALTER TABLE "user_submission" DROP COLUMN "challenge_id";
--> statement-breakpoint
ALTER TABLE "user_xp_transaction" DROP COLUMN "challenge_id";
--> statement-breakpoint
-- Drop old enums
DROP TYPE "public"."challenge_difficulty";
--> statement-breakpoint
DROP TYPE "public"."objective_category";
--> statement-breakpoint
-- Create indexes on new challenge_slug columns
CREATE INDEX "challenge_metadata_available_idx" ON "challenge_metadata" USING btree ("available");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_progress_user_challenge_unique_idx" ON "user_progress" USING btree ("user_id","challenge_slug");
--> statement-breakpoint
CREATE INDEX "user_progress_user_status_challenge_idx" ON "user_progress" USING btree ("user_id","status","challenge_slug");
--> statement-breakpoint
CREATE INDEX "user_progress_challenge_status_idx" ON "user_progress" USING btree ("challenge_slug","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_submission_user_challenge_attempt_idx" ON "user_submission" USING btree ("user_id","challenge_slug","attempt_number");
--> statement-breakpoint
CREATE INDEX "user_submission_user_challenge_idx" ON "user_submission" USING btree ("user_id","challenge_slug");
