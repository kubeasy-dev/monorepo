import { ChallengeDifficultySchema } from "@kubeasy/api-schemas/challenges";
import { ObjectiveSchema } from "@kubeasy/api-schemas/objectives";
import { z } from "zod";

// Schema for a single challenge in the sync request
export const challengeSyncSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  theme: z.string().min(1),
  difficulty: ChallengeDifficultySchema,
  type: z.string().min(1),
  estimatedTime: z.number().int().positive(),
  initialSituation: z.string().min(1),
  objectives: z.array(ObjectiveSchema),
});
export type ChallengeSyncItem = z.infer<typeof challengeSyncSchema>;

export const syncRequestSchema = z.object({
  challenges: z.array(challengeSyncSchema),
});
export type SyncRequest = z.infer<typeof syncRequestSchema>;
