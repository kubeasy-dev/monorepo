-- Deduplicate existing rows before creating the unique index.
-- Keeps the earliest row (lowest id) for each (user_id, challenge_slug, action) tuple.
DELETE FROM "user_xp_transaction"
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, challenge_slug, action
        ORDER BY id
      ) AS rn
    FROM "user_xp_transaction"
    WHERE challenge_slug IS NOT NULL
  ) t
  WHERE rn > 1
);

CREATE UNIQUE INDEX "user_xp_transaction_unique_user_challenge_action_idx" ON "user_xp_transaction" USING btree ("user_id","challenge_slug","action") WHERE "user_xp_transaction"."challenge_slug" IS NOT NULL;
