import { z } from "zod";
import {
  type ChallengeDifficulty,
  ChallengeDifficultySchema,
  challengeDifficultyValues,
} from "./registry";

export {
  ChallengeDifficultySchema,
  type ChallengeDifficulty,
  challengeDifficultyValues,
};

// ---------- Inputs ----------

export const ChallengeListInputSchema = z.object({
  difficulty: ChallengeDifficultySchema.optional(),
  type: z.string().optional(),
  theme: z.string().optional(),
  showCompleted: z.boolean().default(true).optional(),
  search: z.string().optional(),
});
export type ChallengeListInput = z.infer<typeof ChallengeListInputSchema>;

export const SlugInputSchema = z.object({
  slug: z.string(),
});
export type SlugInput = z.infer<typeof SlugInputSchema>;

// ---------- Outputs ----------

export const ChallengeListItemSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  theme: z.string(),
  themeSlug: z.string(),
  difficulty: ChallengeDifficultySchema,
  type: z.string(),
  typeSlug: z.string(),
  estimatedTime: z.number().int(),
  initialSituation: z.string(),
  ofTheWeek: z.boolean(),
  completedCount: z.number().int(),
  userStatus: z.string().nullable(),
});
export type ChallengeListItem = z.infer<typeof ChallengeListItemSchema>;

export const ChallengeListOutputSchema = z.object({
  challenges: z.array(ChallengeListItemSchema),
  count: z.number().int(),
});
export type ChallengeListOutput = z.infer<typeof ChallengeListOutputSchema>;

export const ChallengeDetailSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  theme: z.string(),
  themeSlug: z.string(),
  difficulty: ChallengeDifficultySchema,
  type: z.string(),
  typeSlug: z.string(),
  estimatedTime: z.number().int(),
  initialSituation: z.string(),
  ofTheWeek: z.boolean(),
  available: z.boolean(),
  starterFriendly: z.boolean(),
});
export type ChallengeDetail = z.infer<typeof ChallengeDetailSchema>;

export const ChallengeGetBySlugOutputSchema = z.object({
  challenge: ChallengeDetailSchema.nullable(),
});
export type ChallengeGetBySlugOutput = z.infer<
  typeof ChallengeGetBySlugOutputSchema
>;

export const ChallengeObjectiveItemSchema = z.object({
  objectiveKey: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  displayOrder: z.number().int(),
});
export type ChallengeObjectiveItem = z.infer<
  typeof ChallengeObjectiveItemSchema
>;

export const ChallengeGetObjectivesOutputSchema = z.object({
  objectives: z.array(ChallengeObjectiveItemSchema),
});
export type ChallengeGetObjectivesOutput = z.infer<
  typeof ChallengeGetObjectivesOutputSchema
>;

// ---------- Admin ----------

export const AdminChallengeItemSchema = z.object({
  slug: z.string(),
  title: z.string(),
  difficulty: ChallengeDifficultySchema,
  theme: z.string(),
  type: z.string(),
  available: z.boolean(),
  ofTheWeek: z.boolean(),
  starts: z.number().int(),
  completions: z.number().int(),
  totalSubmissions: z.number().int(),
  successfulSubmissions: z.number().int(),
});
export type AdminChallengeItem = z.infer<typeof AdminChallengeItemSchema>;

export const AdminChallengeListOutputSchema = z.object({
  challenges: z.array(AdminChallengeItemSchema),
});
export type AdminChallengeListOutput = z.infer<
  typeof AdminChallengeListOutputSchema
>;

export const AdminStatsOutputSchema = z.object({
  totalSubmissions: z.number().int(),
  successfulSubmissions: z.number().int(),
  successRate: z.number(),
  totalStarts: z.number().int(),
  totalCompletions: z.number().int(),
  completionRate: z.number(),
});
export type AdminStatsOutput = z.infer<typeof AdminStatsOutputSchema>;

// ---------- Filters ----------

export const ChallengeFiltersSchema = z.object({
  difficulty: ChallengeDifficultySchema.optional(),
  type: z.string().optional(),
  theme: z.string().optional(),
  search: z.string().optional(),
  // Query strings are always strings; coerce "false" → false, everything else → true
  showCompleted: z
    .string()
    .optional()
    .transform((v) => v !== "false")
    .pipe(z.boolean()),
});

export type ChallengeFilters = z.infer<typeof ChallengeFiltersSchema>;
