import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const challengeMetadata = pgTable(
  "challenge_metadata",
  {
    slug: text("slug").primaryKey(),
    ofTheWeek: boolean("of_the_week").default(false).notNull(),
    starterFriendly: boolean("starter_friendly").default(false).notNull(),
    available: boolean("available").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("challenge_metadata_available_idx").on(t.available)],
);
