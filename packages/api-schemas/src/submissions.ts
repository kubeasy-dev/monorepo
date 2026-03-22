import { z } from "zod";
import { ObjectiveTypeSchema } from "./objectives";

// ---------- Enums ----------

export const ObjectiveCategorySchema = ObjectiveTypeSchema;
export type ObjectiveCategory = z.infer<typeof ObjectiveCategorySchema>;

// ---------- Core schemas ----------

export const ObjectiveResultSchema = z.object({
  objectiveKey: z.string(),
  passed: z.boolean(),
  message: z.string().optional(),
});
export type ObjectiveResult = z.infer<typeof ObjectiveResultSchema>;

export const ObjectiveSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  passed: z.boolean(),
  category: ObjectiveCategorySchema,
  message: z.string().optional(),
});
export type Objective = z.infer<typeof ObjectiveSchema>;

// ---------- Submit ----------

export const ChallengeSubmitInputSchema = z.object({
  challengeSlug: z.string(),
  results: z.array(ObjectiveResultSchema).min(1),
});
export type ChallengeSubmitInput = z.infer<typeof ChallengeSubmitInputSchema>;

export const ChallengeSubmitSuccessOutputSchema = z.object({
  success: z.literal(true),
  xpAwarded: z.number(),
  totalXp: z.number(),
  rank: z.string().nullable(),
  rankUp: z.boolean(),
  firstChallenge: z.boolean(),
  streakBonus: z.number(),
  currentStreak: z.number(),
});
export type ChallengeSubmitSuccessOutput = z.infer<
  typeof ChallengeSubmitSuccessOutputSchema
>;

export const ChallengeSubmitFailureOutputSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  failedObjectives: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      message: z.string(),
    }),
  ),
});
export type ChallengeSubmitFailureOutput = z.infer<
  typeof ChallengeSubmitFailureOutputSchema
>;

export const ChallengeSubmitOutputSchema = z.union([
  ChallengeSubmitSuccessOutputSchema,
  ChallengeSubmitFailureOutputSchema,
]);
export type ChallengeSubmitOutput = z.infer<typeof ChallengeSubmitOutputSchema>;
