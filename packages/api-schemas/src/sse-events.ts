import { z } from "zod";

const RankInfoSchema = z.object({
  name: z.string(),
  minXp: z.number().int(),
  nextRankXp: z.number().int().nullable(),
  progress: z.number().int(),
});

export const ChallengeCompletedEventDataSchema = z.object({
  challengeSlug: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  xpGain: z.object({
    base: z.number().int(),
    firstChallenge: z.number().int(),
    streak: z.number().int(),
    total: z.number().int(),
  }),
  isFirstChallenge: z.boolean(),
  currentStreak: z.number().int(),
  attemptsCount: z.number().int(),
  commandsCount: z.number().int(),
  leveledUp: z.boolean(),
  prevRank: RankInfoSchema,
  newRank: RankInfoSchema,
});

export type ChallengeCompletedEventData = z.infer<
  typeof ChallengeCompletedEventDataSchema
>;
