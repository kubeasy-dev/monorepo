// ⚠️ AUTO-GENERATED - DO NOT EDIT
// Source: github.com/kubeasy-dev/registry/pkg/challenges
// Run: go run . generate-schema
// biome-ignore-all lint: auto-generated file

import { z } from "zod";


export const challengeDifficultyValues = ["easy", "medium", "hard"] as const;
export const ChallengeDifficultySchema = z.enum(challengeDifficultyValues);
export type ChallengeDifficulty = z.infer<typeof ChallengeDifficultySchema>;

export const challengeTypeValues = ["fix", "build", "migrate"] as const;
export const ChallengeTypeSchema = z.enum(challengeTypeValues);
export type ChallengeType = z.infer<typeof ChallengeTypeSchema>;

export const challengeThemeValues = ["pods-containers", "resources-scaling", "networking", "volumes-secrets", "rbac-security", "scheduling-affinity", "jobs-cronjobs", "ingress-tls", "monitoring-debugging"] as const;
export const ChallengeThemeSchema = z.enum(challengeThemeValues);
export type ChallengeTheme = z.infer<typeof ChallengeThemeSchema>;

export const objectiveTypeValues = [
  "status",
  "condition",
  "log",
  "event",
  "connectivity",
  "rbac",
  "spec",
  "triggered",
] as const;
export const ObjectiveTypeSchema = z.enum(objectiveTypeValues);
export type ObjectiveType = z.infer<typeof ObjectiveTypeSchema>;
export const RegistryThemeSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  logo: z.string(),
})
export type RegistryTheme = z.infer<typeof RegistryThemeSchema>

export const RegistryChallengeTypeSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  logo: z.string(),
})
export type RegistryChallengeType = z.infer<typeof RegistryChallengeTypeSchema>

export const InternalObjectiveSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  order: z.number(),
  type: ChallengeTypeSchema,
  spec: z.any(),
})
export type InternalObjective = z.infer<typeof InternalObjectiveSchema>

export const ObjectiveSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  order: z.number(),
  type: ChallengeTypeSchema,
  spec: z.any(),
})
export type Objective = z.infer<typeof ObjectiveSchema>

export const InternalChallengeSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  theme: ChallengeThemeSchema,
  difficulty: ChallengeDifficultySchema,
  type: ChallengeTypeSchema,
  estimatedTime: z.number(),
  initialSituation: z.string(),
  minRequiredVersion: z.string().optional(),
  objectives: ObjectiveSchema.array().nullable(),
})
export type InternalChallenge = z.infer<typeof InternalChallengeSchema>

export const TargetSchema = z.object({
  kind: z.string(),
  name: z.string().optional(),
  labelSelector: z.record(z.string(), z.string()).optional(),
})
export type Target = z.infer<typeof TargetSchema>

export const StatusCheckSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.any(),
})
export type StatusCheck = z.infer<typeof StatusCheckSchema>

export const ConditionCheckSchema = z.object({
  type: ChallengeTypeSchema,
  status: z.string(),
})
export type ConditionCheck = z.infer<typeof ConditionCheckSchema>

export const SourcePodSchema = z.object({
  name: z.string().optional(),
  labelSelector: z.record(z.string(), z.string()).optional(),
  namespace: z.string().optional(),
})
export type SourcePod = z.infer<typeof SourcePodSchema>

export const TLSConfigSchema = z.object({
  insecureSkipVerify: z.boolean().optional(),
  validateExpiry: z.boolean().optional(),
  validateSANs: z.boolean().optional(),
})
export type TLSConfig = z.infer<typeof TLSConfigSchema>

export const ConnectivityCheckSchema = z.object({
  url: z.string(),
  expectedStatusCode: z.number(),
  timeoutSeconds: z.number().optional(),
  hostHeader: z.string().optional(),
  tls: TLSConfigSchema.optional(),
})
export type ConnectivityCheck = z.infer<typeof ConnectivityCheckSchema>

export const RbacCheckSchema = z.object({
  verb: z.string(),
  resource: z.string(),
  subresource: z.string().optional(),
  namespace: z.string().optional(),
  allowed: z.boolean(),
})
export type RbacCheck = z.infer<typeof RbacCheckSchema>

export const SpecCheckSchema = z.object({
  path: z.string(),
  exists: z.boolean().optional(),
  value: z.any(),
  contains: z.any(),
})
export type SpecCheck = z.infer<typeof SpecCheckSchema>

export const TriggerConfigSchema = z.object({
  type: ChallengeTypeSchema,
  url: z.string().optional(),
  requestsPerSecond: z.number().optional(),
  durationSeconds: z.number().optional(),
  sourcePod: SourcePodSchema.optional(),
  target: TargetSchema.optional(),
  image: z.string().optional(),
  container: z.string().optional(),
  replicas: z.number().optional(),
  waitSeconds: z.number().optional(),
})
export type TriggerConfig = z.infer<typeof TriggerConfigSchema>

export const StatusSpecSchema = z.object({
  target: TargetSchema,
  checks: StatusCheckSchema.array().nullable(),
})
export type StatusSpec = z.infer<typeof StatusSpecSchema>

export const ConditionSpecSchema = z.object({
  target: TargetSchema,
  checks: ConditionCheckSchema.array().nullable(),
})
export type ConditionSpec = z.infer<typeof ConditionSpecSchema>

export const LogSpecSchema = z.object({
  target: TargetSchema,
  container: z.string().optional(),
  expectedStrings: z.string().array().nullable(),
  sinceSeconds: z.number().optional(),
  previous: z.boolean().optional(),
  matchMode: z.string().optional(),
})
export type LogSpec = z.infer<typeof LogSpecSchema>

export const EventSpecSchema = z.object({
  target: TargetSchema,
  forbiddenReasons: z.string().array().nullable(),
  requiredReasons: z.string().array().optional(),
  sinceSeconds: z.number().optional(),
})
export type EventSpec = z.infer<typeof EventSpecSchema>

export const ConnectivitySpecSchema = z.object({
  mode: z.string().optional(),
  sourcePod: SourcePodSchema,
  targets: ConnectivityCheckSchema.array().nullable(),
})
export type ConnectivitySpec = z.infer<typeof ConnectivitySpecSchema>

export const RbacSpecSchema = z.object({
  serviceAccount: z.string(),
  namespace: z.string(),
  checks: RbacCheckSchema.array().nullable(),
})
export type RbacSpec = z.infer<typeof RbacSpecSchema>

export const SpecSpecSchema = z.object({
  target: TargetSchema,
  checks: SpecCheckSchema.array().nullable(),
})
export type SpecSpec = z.infer<typeof SpecSpecSchema>

export const TriggeredSpecSchema = z.object({
  trigger: TriggerConfigSchema,
  waitAfterSeconds: z.number(),
  then: ObjectiveSchema.array().nullable(),
})
export type TriggeredSpec = z.infer<typeof TriggeredSpecSchema>


export const ObjectiveSpecSchema = z.union([
  StatusSpecSchema,
  ConditionSpecSchema,
  LogSpecSchema,
  EventSpecSchema,
  ConnectivitySpecSchema,
  RbacSpecSchema,
  SpecSpecSchema,
  TriggeredSpecSchema,
]);
export type ObjectiveSpec = z.infer<typeof ObjectiveSpecSchema>;

// Final public schemas
export const RegistryObjectiveSchema = InternalObjectiveSchema.extend({
  type: ObjectiveTypeSchema,
  spec: ObjectiveSpecSchema,
});
export type RegistryObjective = z.infer<typeof RegistryObjectiveSchema>;

export const RegistryChallengeSchema = InternalChallengeSchema.extend({
  theme: ChallengeThemeSchema,
  difficulty: ChallengeDifficultySchema,
  type: ChallengeTypeSchema,
  objectives: z.array(RegistryObjectiveSchema),
});
export type RegistryChallenge = z.infer<typeof RegistryChallengeSchema>;

// RegistryMetaSchema mirrors the GET /meta response from the registry.
export const RegistryMetaSchema = z.object({
  themes: z.array(RegistryThemeSchema),
  types: z.array(RegistryChallengeTypeSchema),
  difficulties: z.array(z.string()),
});
export type RegistryMeta = z.infer<typeof RegistryMetaSchema>;

// RegistryChallengeYamlSchema is the challenge.yaml file format.
export const RegistryChallengeYamlSchema = RegistryChallengeSchema.omit({ slug: true });
export type RegistryChallengeYaml = z.infer<typeof RegistryChallengeYamlSchema>;
