import { relations } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth.js";

export const userOnboarding = pgTable(
  "user_onboarding",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .unique(), // One record per user

    // Wizard status
    completedAt: timestamp("completed_at"),
    skippedAt: timestamp("skipped_at"),

    // CLI milestones (booleans - detailed timestamps in PostHog)
    cliAuthenticated: boolean("cli_authenticated").default(false).notNull(),
    clusterInitialized: boolean("cluster_initialized").default(false).notNull(),

    // Vercel Workflow
    workflowRunId: text("workflow_run_id"), // Workflow run ID
    tokenWebhookUrl: text("token_webhook_url"), // Webhook for step 3
    loginWebhookUrl: text("login_webhook_url"), // Webhook for step 4
    setupWebhookUrl: text("setup_webhook_url"), // Webhook for step 5
    startWebhookUrl: text("start_webhook_url"), // Webhook for step 6
    completeWebhookUrl: text("complete_webhook_url"), // Webhook for step 7

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("user_onboarding_user_id_idx").on(table.userId)],
);

export const userOnboardingRelations = relations(userOnboarding, ({ one }) => ({
  user: one(user, {
    fields: [userOnboarding.userId],
    references: [user.id],
  }),
}));
