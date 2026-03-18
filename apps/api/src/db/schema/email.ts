import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Email topics synced from Resend
 * This table mirrors Resend Topics for local reference and UI display
 */
export const emailTopic = pgTable("email_topic", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  resendTopicId: text("resend_topic_id").notNull().unique(), // Resend topic ID
  name: text("name").notNull(),
  description: text("description"),
  defaultOptIn: boolean("default_opt_in").default(true).notNull(), // Resend's default_subscription
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
