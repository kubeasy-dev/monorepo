import { z } from "zod";

// ---------- Enums ----------

export const XpActionSchema = z.enum([
  "challenge_completed",
  "daily_streak",
  "first_challenge",
  "milestone_reached",
  "bonus",
]);
export type XpAction = z.infer<typeof XpActionSchema>;

// ---------- XP Transaction ----------

export const XpTransactionSchema = z.object({
  id: z.number().int(),
  action: XpActionSchema,
  xpAmount: z.number().int(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  challengeId: z.number().int().nullable(),
  challengeTitle: z.string().nullable(),
  challengeSlug: z.string().nullable(),
  challengeDifficulty: z.enum(["easy", "medium", "hard"]).nullable(),
});
export type XpTransaction = z.infer<typeof XpTransactionSchema>;

// API output shape (dates serialized as ISO strings over JSON)
export const XpHistoryItemSchema = z.object({
  id: z.number().int(),
  action: z.string(),
  xpAmount: z.number().int(),
  description: z.string().nullable(),
  createdAt: z.string().describe("ISO 8601 date string"),
  challengeId: z.number().int().nullable(),
  challengeTitle: z.string().nullable(),
  challengeSlug: z.string().nullable(),
  challengeDifficulty: z.string().nullable(),
});
export type XpHistoryItem = z.infer<typeof XpHistoryItemSchema>;
