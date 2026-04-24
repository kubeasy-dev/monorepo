import { z } from "zod";
import { ObjectiveTypeSchema } from "./registry";

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
  key: z.string(),
  title: z.string(),
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
      key: z.string(),
      title: z.string(),
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

// ---------- Audit & Validation ----------

export const AuditEventSchema = z.object({
  timestamp: z.string().datetime({ offset: true }),
  verb: z.string().max(64),
  resource: z.string().max(128),
  subresource: z.string().max(128).optional(),
  name: z.string().max(253).optional(), // k8s name max length
  namespace: z.string().max(63).optional(), // k8s namespace max length
  userAgent: z.string().max(512).optional(),
  responseCode: z.number().int().min(100).max(599).optional(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const SubmitBodySchema = z.object({
  results: z.array(ObjectiveResultSchema).min(1),
  auditEvents: z.array(AuditEventSchema).max(10_000).optional(),
});
export type SubmitBody = z.infer<typeof SubmitBodySchema>;

// ---------- Submission record (API list/history output) ----------

export const SubmissionRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  challengeSlug: z.string(),
  validated: z.boolean(),
  objectives: z.array(ObjectiveSchema).nullable(),
  timestamp: z.string().describe("ISO 8601 date string"),
});
export type SubmissionRecord = z.infer<typeof SubmissionRecordSchema>;
