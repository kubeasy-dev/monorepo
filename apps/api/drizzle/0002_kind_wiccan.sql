ALTER TABLE "user_submission" ADD COLUMN "attempt_number" integer;--> statement-breakpoint
ALTER TABLE "user_submission" ADD COLUMN "audit_events" jsonb;--> statement-breakpoint
UPDATE "user_submission"
SET "attempt_number" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, challenge_id ORDER BY "timestamp") AS rn
  FROM "user_submission"
) sub
WHERE "user_submission".id = sub.id;--> statement-breakpoint
ALTER TABLE "user_submission" ALTER COLUMN "attempt_number" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "user_submission_user_challenge_idx" ON "user_submission" USING btree ("user_id","challenge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_submission_user_challenge_attempt_idx" ON "user_submission" USING btree ("user_id","challenge_id","attempt_number");