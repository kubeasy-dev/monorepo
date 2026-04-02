// ⚠️ AUTO-GENERATED - DO NOT EDIT
// Source: github.com/kubeasy-dev/kubeasy-cli/internal/validation
// Run: go run hack/generate-schema/main.go > packages/api-schemas/src/objectives.ts

import { z } from "zod";

export const TargetSchema = z.object({
  kind: z.string(),
  name: z.string().optional(),
  labelSelector: z.record(z.string(), z.string()).optional(),
});
export type Target = z.infer<typeof TargetSchema>;

export const StatusCheckSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.any(),
});
export type StatusCheck = z.infer<typeof StatusCheckSchema>;

export const StatusSpecSchema = z.object({
  target: TargetSchema,
  checks: StatusCheckSchema.array().nullable(),
});
export type StatusSpec = z.infer<typeof StatusSpecSchema>;

export const ConditionCheckSchema = z.object({
  type: z.string(),
  status: z.string(),
});
export type ConditionCheck = z.infer<typeof ConditionCheckSchema>;

export const ConditionSpecSchema = z.object({
  target: TargetSchema,
  checks: ConditionCheckSchema.array().nullable(),
});
export type ConditionSpec = z.infer<typeof ConditionSpecSchema>;

export const LogSpecSchema = z.object({
  target: TargetSchema,
  container: z.string().optional(),
  expectedStrings: z.string().array().nullable(),
  sinceSeconds: z.number().optional(),
});
export type LogSpec = z.infer<typeof LogSpecSchema>;

export const EventSpecSchema = z.object({
  target: TargetSchema,
  forbiddenReasons: z.string().array().nullable(),
  sinceSeconds: z.number().optional(),
});
export type EventSpec = z.infer<typeof EventSpecSchema>;

export const SourcePodSchema = z.object({
  name: z.string().optional(),
  labelSelector: z.record(z.string(), z.string()).optional(),
});
export type SourcePod = z.infer<typeof SourcePodSchema>;

export const ConnectivityCheckSchema = z.object({
  url: z.string(),
  expectedStatusCode: z.number(),
  timeoutSeconds: z.number().optional(),
});
export type ConnectivityCheck = z.infer<typeof ConnectivityCheckSchema>;

export const ConnectivitySpecSchema = z.object({
  sourcePod: SourcePodSchema,
  targets: ConnectivityCheckSchema.array().nullable(),
});
export type ConnectivitySpec = z.infer<typeof ConnectivitySpecSchema>;

export const objectiveTypeValues = [
  "status",
  "condition",
  "log",
  "event",
  "connectivity",
] as const;
export const ObjectiveTypeSchema = z.enum(objectiveTypeValues);
export type ObjectiveType = z.infer<typeof ObjectiveTypeSchema>;

export const ObjectiveSpecSchema = z.union([
  StatusSpecSchema,
  ConditionSpecSchema,
  LogSpecSchema,
  EventSpecSchema,
  ConnectivitySpecSchema,
]);
export type ObjectiveSpec = z.infer<typeof ObjectiveSpecSchema>;

export const ObjectiveSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  order: z.number().int(),
  type: ObjectiveTypeSchema,
  spec: ObjectiveSpecSchema,
});
export type Objective = z.infer<typeof ObjectiveSchema>;

export const challengeYamlDifficultyValues = [
  "easy",
  "medium",
  "hard",
] as const;
export const ChallengeYamlDifficultySchema = z.enum(
  challengeYamlDifficultyValues,
);
export type ChallengeYamlDifficulty = z.infer<
  typeof ChallengeYamlDifficultySchema
>;

export const challengeYamlTypeValues = ["fix", "build", "migrate"] as const;
export const ChallengeYamlTypeSchema = z.enum(challengeYamlTypeValues);
export type ChallengeYamlType = z.infer<typeof ChallengeYamlTypeSchema>;

// ChallengeYamlSchema is the single source of truth for the challenge.yaml file format.
// Generated from ChallengeYamlSpec in github.com/kubeasy-dev/kubeasy-cli/internal/validation/vtypes.
// Required fields map to non-omitempty struct fields; optional fields map to omitempty fields.
export const ChallengeYamlSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  theme: z.string().min(1),
  difficulty: ChallengeYamlDifficultySchema,
  type: ChallengeYamlTypeSchema.default("fix"),
  estimatedTime: z.number().int().positive(),
  initialSituation: z.string().min(1),
  minRequiredVersion: z.string().optional(),
  objectives: z.array(ObjectiveSchema).default([]),
});
export type ChallengeYaml = z.infer<typeof ChallengeYamlSchema>;
