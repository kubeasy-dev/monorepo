import { ChallengeYamlSchema } from "@kubeasy/api-schemas/objectives";
import { z } from "zod";

// challengeSyncSchema is derived from ChallengeYamlSchema (single source of truth):
// - removes minRequiredVersion (CLI-only field, not stored in DB)
// - adds slug (derived from folder name by the sync script, not in the YAML file)
export const challengeSyncSchema = ChallengeYamlSchema.omit({
  minRequiredVersion: true,
}).extend({
  slug: z.string().min(1),
});
export type ChallengeSyncItem = z.infer<typeof challengeSyncSchema>;

export const syncRequestSchema = z.object({
  challenges: z.array(challengeSyncSchema),
});
export type SyncRequest = z.infer<typeof syncRequestSchema>;
