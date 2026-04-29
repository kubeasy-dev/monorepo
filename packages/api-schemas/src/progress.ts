import { z } from "zod";

// ---------- Enums ----------

export const ChallengeStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
]);
export type ChallengeStatus = z.infer<typeof ChallengeStatusSchema>;

// ---------- Completion Percentage ----------

export const CompletionPercentageInputSchema = z
  .object({
    splitByTheme: z.boolean().default(false),
    themeSlug: z.string().optional(),
  })
  .optional()
  .default({ splitByTheme: false });
export type CompletionPercentageInput = z.infer<
  typeof CompletionPercentageInputSchema
>;

export const CompletionPercentageQuerySchema = z.object({
  splitByTheme: z
    .string()
    .optional()
    .transform((v) => v === "true")
    .pipe(z.boolean()),
  themeSlug: z.string().optional(),
});
export type CompletionPercentageQuery = z.infer<
  typeof CompletionPercentageQuerySchema
>;

export const ThemeCompletionSchema = z.object({
  themeSlug: z.string(),
  completedCount: z.number(),
  totalCount: z.number(),
  percentageCompleted: z.number(),
});
export type ThemeCompletion = z.infer<typeof ThemeCompletionSchema>;

export const CompletionPercentageOutputSchema = z.object({
  completedCount: z.number(),
  totalCount: z.number(),
  percentageCompleted: z.number(),
  byTheme: z.array(ThemeCompletionSchema).optional(),
});
export type CompletionPercentageOutput = z.infer<
  typeof CompletionPercentageOutputSchema
>;

// ---------- XP and Rank ----------

export const XpAndRankOutputSchema = z.object({
  xpEarned: z.number(),
  rank: z.string(),
  rankInfo: z.object({
    name: z.string(),
    progress: z.number(),
    nextRankXp: z.number().nullable(),
  }),
});
export type XpAndRankOutput = z.infer<typeof XpAndRankOutputSchema>;

// ---------- Streak ----------

export const StreakOutputSchema = z.object({
  currentStreak: z.number(),
  lastActivityDate: z.string().nullable(),
});
export type StreakOutput = z.infer<typeof StreakOutputSchema>;

// ---------- Complete Challenge ----------

export const CompleteChallengeInputSchema = z.object({
  challengeId: z.number(),
});
export type CompleteChallengeInput = z.infer<
  typeof CompleteChallengeInputSchema
>;

export const CompleteChallengeOutputSchema = z.object({
  success: z.boolean(),
  xpAwarded: z.number(),
  baseXp: z.number(),
  bonusXp: z.number(),
  streakBonus: z.number(),
  currentStreak: z.number(),
  isFirstChallenge: z.boolean(),
});
export type CompleteChallengeOutput = z.infer<
  typeof CompleteChallengeOutputSchema
>;

// ---------- Get Status ----------

export const GetStatusInputSchema = z.object({
  slug: z.string(),
});
export type GetStatusInput = z.infer<typeof GetStatusInputSchema>;

export const GetStatusOutputSchema = z.object({
  status: ChallengeStatusSchema,
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});
export type GetStatusOutput = z.infer<typeof GetStatusOutputSchema>;

// ---------- Start Challenge ----------

export const StartChallengeInputSchema = z.object({
  challengeSlug: z.string(),
});
export type StartChallengeInput = z.infer<typeof StartChallengeInputSchema>;

export const StartChallengeOutputSchema = z.object({
  status: z.enum(["in_progress", "completed"]),
  startedAt: z.coerce.date().optional(),
  message: z.string().optional(),
});
export type StartChallengeOutput = z.infer<typeof StartChallengeOutputSchema>;

// ---------- Reset Challenge ----------

export const ResetChallengeInputSchema = z.object({
  challengeSlug: z.string(),
});
export type ResetChallengeInput = z.infer<typeof ResetChallengeInputSchema>;

export const ResetChallengeOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  isReplay: z.boolean().optional(),
  previousStatus: z.string().optional(),
});
export type ResetChallengeOutput = z.infer<typeof ResetChallengeOutputSchema>;

// ---------- Get Submissions ----------

export const GetSubmissionsInputSchema = z.object({
  slug: z.string(),
});
export type GetSubmissionsInput = z.infer<typeof GetSubmissionsInputSchema>;

// ---------- Latest Validation Status ----------

export const LatestValidationStatusInputSchema = z.object({
  slug: z.string(),
});
export type LatestValidationStatusInput = z.infer<
  typeof LatestValidationStatusInputSchema
>;

export const LatestValidationStatusOutputSchema = z.object({
  hasSubmission: z.boolean(),
  validated: z.boolean(),
  objectives: z.any().nullable(),
  timestamp: z.coerce.date().nullable(),
});
export type LatestValidationStatusOutput = z.infer<
  typeof LatestValidationStatusOutputSchema
>;
