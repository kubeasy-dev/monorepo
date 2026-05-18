import {
  index,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
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
    index("cli_events_created_at_idx").on(table.createdAt),
  ],
);
