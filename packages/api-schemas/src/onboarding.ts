import { z } from "zod";

export const OnboardingStatusSchema = z.object({
  steps: z.object({
    hasApiToken: z.boolean(),
    cliAuthenticated: z.boolean(),
    clusterInitialized: z.boolean(),
    hasStartedChallenge: z.boolean(),
    hasCompletedChallenge: z.boolean(),
  }),
  currentStep: z.number().int().min(1).max(7),
  isComplete: z.boolean(),
  isSkipped: z.boolean(),
});
export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>;
