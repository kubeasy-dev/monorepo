import "zod-openapi";
import { z } from "zod";
import {
  challengeDifficultyEnum,
  challengeStatusEnum,
  objectiveCategoryEnum,
} from "@/server/db/schema/challenge";

// ---------- Shared ----------

export const errorResponseSchema = z
  .object({
    error: z.string(),
    details: z.string().optional(),
  })
  .meta({ description: "Standard error response" });

export const cliMetadataSchema = z
  .object({
    cliVersion: z.string(),
    os: z.string(),
    arch: z.string(),
  })
  .meta({ description: "CLI metadata sent with tracking requests" });

export const slugParamSchema = z.object({
  slug: z
    .string()
    .meta({ description: "Challenge slug", example: "pod-evicted" }),
});

// ---------- User ----------

export const userResponseSchema = z
  .object({
    firstName: z.string(),
    lastName: z.string().nullable(),
  })
  .meta({ description: "User profile information" });

export const userLoginResponseSchema = z
  .object({
    firstName: z.string(),
    lastName: z.string().nullable(),
    firstLogin: z.boolean(),
  })
  .meta({ description: "User login response with first-login flag" });

// ---------- Challenge ----------

export const challengeResponseSchema = z
  .object({
    id: z.number().int(),
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    difficulty: z.enum(challengeDifficultyEnum.enumValues),
    theme: z.string(),
    initial_situation: z.string(),
  })
  .meta({ description: "Challenge details" });

export const challengeStartResponseSchema = z
  .object({
    status: z.enum(challengeStatusEnum.enumValues).exclude(["not_started"]),
    startedAt: z.string().meta({ description: "ISO 8601 date string" }),
    message: z.string().optional(),
  })
  .meta({ description: "Challenge start response" });

export const challengeStatusResponseSchema = z
  .object({
    status: z.enum(challengeStatusEnum.enumValues),
    startedAt: z
      .string()
      .optional()
      .meta({ description: "ISO 8601 date string" }),
    completedAt: z
      .string()
      .optional()
      .meta({ description: "ISO 8601 date string" }),
  })
  .meta({ description: "Challenge progress status" });

// ---------- Submit ----------

export const objectiveCategorySchema = z.enum(objectiveCategoryEnum.enumValues);

export const objectiveResultSchema = z
  .object({
    objectiveKey: z
      .string()
      .meta({ description: "Validation key (e.g. pod-ready-check)" }),
    passed: z.boolean(),
    message: z.string().optional(),
  })
  .meta({ description: "Result from a single validation" });

export const objectiveSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    passed: z.boolean(),
    category: objectiveCategorySchema,
    message: z.string().optional(),
  })
  .meta({ description: "Enriched objective with metadata" });

export const challengeSubmitRequestSchema = z
  .object({
    results: z.array(objectiveResultSchema).min(1),
  })
  .meta({ description: "Challenge submission payload" });

export const challengeSubmitSuccessResponseSchema = z
  .object({
    success: z.literal(true),
    xpAwarded: z.number(),
    totalXp: z.number(),
    rank: z.string(),
    rankUp: z.boolean().optional(),
    firstChallenge: z.boolean().optional(),
  })
  .meta({ description: "Successful challenge submission" });

export const challengeSubmitFailureResponseSchema = z
  .object({
    success: z.literal(false),
    message: z.string(),
  })
  .meta({ description: "Failed challenge submission" });

export const challengeSubmitResponseSchema = z
  .union([
    challengeSubmitSuccessResponseSchema,
    challengeSubmitFailureResponseSchema,
  ])
  .meta({ description: "Challenge submission response" });

// ---------- Reset ----------

export const challengeResetResponseSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
  })
  .meta({ description: "Challenge reset response" });

// ---------- Metadata (public, no auth) ----------

export const cliThemeSchema = z
  .object({
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    logo: z.string().nullable(),
  })
  .meta({ description: "Challenge theme" });

export const cliThemesResponseSchema = z
  .object({
    themes: z.array(cliThemeSchema),
  })
  .meta({ description: "List of available themes" });

export const cliTypeSchema = z
  .object({
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    logo: z.string().nullable(),
  })
  .meta({ description: "Challenge type" });

export const cliTypesResponseSchema = z
  .object({
    types: z.array(cliTypeSchema),
  })
  .meta({ description: "List of available types" });

export const cliDifficultiesResponseSchema = z
  .object({
    difficulties: z.array(z.enum(challengeDifficultyEnum.enumValues)),
  })
  .meta({ description: "List of available difficulty levels" });

// ---------- Track Setup ----------

export const trackSetupResponseSchema = z
  .object({
    success: z.boolean(),
    firstTime: z.boolean(),
  })
  .meta({ description: "Track setup response" });
