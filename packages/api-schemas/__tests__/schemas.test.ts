import { describe, expect, it } from "vitest";
import {
  ChallengeDifficultySchema,
  ChallengeListInputSchema,
  ChallengeStatusSchema,
  ChallengeSubmitInputSchema,
  ObjectiveCategorySchema,
  ObjectiveResultSchema,
  SlugInputSchema,
  UserSchema,
} from "../src/index";

describe("ChallengeListInputSchema", () => {
  it("parses valid input with all fields", () => {
    const result = ChallengeListInputSchema.safeParse({
      difficulty: "easy",
      theme: "resources-scaling",
      showCompleted: false,
      search: "pod",
    });
    expect(result.success).toBe(true);
  });

  it("parses empty object (all optional)", () => {
    const result = ChallengeListInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid difficulty", () => {
    const result = ChallengeListInputSchema.safeParse({
      difficulty: "impossible",
    });
    expect(result.success).toBe(false);
  });
});

describe("ChallengeSubmitInputSchema", () => {
  it("parses valid submission", () => {
    const result = ChallengeSubmitInputSchema.safeParse({
      challengeSlug: "pod-evicted",
      results: [{ objectiveKey: "pod-ready", passed: true, message: "OK" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty results array", () => {
    const result = ChallengeSubmitInputSchema.safeParse({
      challengeSlug: "pod-evicted",
      results: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing challengeSlug", () => {
    const result = ChallengeSubmitInputSchema.safeParse({
      results: [{ objectiveKey: "pod-ready", passed: true }],
    });
    expect(result.success).toBe(false);
  });
});

describe("ObjectiveResultSchema", () => {
  it("parses with optional message", () => {
    const result = ObjectiveResultSchema.safeParse({
      objectiveKey: "pod-ready",
      passed: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing objectiveKey", () => {
    const result = ObjectiveResultSchema.safeParse({ passed: true });
    expect(result.success).toBe(false);
  });
});

describe("enum schemas", () => {
  it("ChallengeDifficultySchema accepts valid values", () => {
    for (const val of ["easy", "medium", "hard"]) {
      expect(ChallengeDifficultySchema.safeParse(val).success).toBe(true);
    }
  });

  it("ChallengeStatusSchema accepts valid values", () => {
    for (const val of ["not_started", "in_progress", "completed"]) {
      expect(ChallengeStatusSchema.safeParse(val).success).toBe(true);
    }
  });

  it("ObjectiveCategorySchema accepts all its enum values", () => {
    for (const val of ObjectiveCategorySchema.options) {
      expect(ObjectiveCategorySchema.safeParse(val).success).toBe(true);
    }
  });

  it("ObjectiveCategorySchema rejects unknown values", () => {
    expect(ObjectiveCategorySchema.safeParse("unknown").success).toBe(false);
  });
});

describe("UserSchema", () => {
  it("parses valid user", () => {
    const result = UserSchema.safeParse({
      id: "abc123",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      image: null,
      role: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("SlugInputSchema", () => {
  it("parses valid slug input", () => {
    const result = SlugInputSchema.safeParse({ slug: "pod-evicted" });
    expect(result.success).toBe(true);
  });

  it("rejects missing slug", () => {
    const result = SlugInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
