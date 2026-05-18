import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const cliEventTypeEnum = pgEnum("cli_event_type", [
  "cli_login",
  "cli_setup",
]);

export const cliEvent = pgTable(
  "cli_events",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    eventType: cliEventTypeEnum("event_type").notNull(),
    cliVersion: text("cli_version").notNull(),
    os: text("os").notNull(),
    arch: text("arch").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("cli_events_user_id_idx").on(table.userId),
    index("cli_events_event_type_idx").on(table.eventType),
  ],
);

export const challengeStatusEnum = pgEnum("challenge_status", [
  "not_started",
  "in_progress",
  "completed",
]);

export const userProgress = pgTable(
  "user_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    challengeSlug: text("challenge_slug").notNull(),
    status: challengeStatusEnum("status").notNull().default("not_started"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("user_progress_user_challenge_unique_idx").on(
      table.userId,
      table.challengeSlug,
    ),
    index("user_progress_user_status_challenge_idx").on(
      table.userId,
      table.status,
      table.challengeSlug,
    ),
    index("user_progress_challenge_status_idx").on(
      table.challengeSlug,
      table.status,
    ),
  ],
);

export const userSubmission = pgTable(
  "user_submission",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    challengeSlug: text("challenge_slug").notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    validated: boolean("validated").notNull().default(false),
    objectives: jsonb("objectives"),
    attemptNumber: integer("attempt_number").notNull(),
    auditEvents: jsonb("audit_events"),
  },
  (table) => [
    uniqueIndex("user_submission_user_challenge_attempt_idx").on(
      table.userId,
      table.challengeSlug,
      table.attemptNumber,
    ),
    index("user_submission_user_challenge_idx").on(
      table.userId,
      table.challengeSlug,
    ),
  ],
);

export const xpActionEnum = pgEnum("xp_action", [
  "challenge_completed",
  "daily_streak",
  "first_challenge",
  "milestone_reached",
  "bonus",
]);

export const userXp = pgTable(
  "user_xp",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    totalXp: integer("total_xp").notNull().default(0),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("user_xp_total_xp_idx").on(table.totalXp)],
);

export const userXpTransaction = pgTable(
  "user_xp_transaction",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: xpActionEnum("action").notNull(),
    xpAmount: integer("xp_amount").notNull(),
    challengeSlug: text("challenge_slug"),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_xp_transaction_user_id_idx").on(table.userId),
    index("user_xp_transaction_user_action_idx").on(table.userId, table.action),
    uniqueIndex("user_xp_transaction_unique_user_challenge_action_idx")
      .on(table.userId, table.challengeSlug, table.action)
      .where(sql`${table.challengeSlug} IS NOT NULL`),
  ],
);
