import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  ChallengeDetailSchema,
  ChallengeGetObjectivesOutputSchema,
  ChallengeListOutputSchema,
} from "@kubeasy/api-schemas/challenges";
import {
  CompletionPercentageOutputSchema,
  GetStatusOutputSchema,
  ResetChallengeOutputSchema,
  StartChallengeOutputSchema,
  StreakOutputSchema,
  XpAndRankOutputSchema,
} from "@kubeasy/api-schemas/progress";
import { ThemeSchema } from "@kubeasy/api-schemas/themes";
import { TypeSchema } from "@kubeasy/api-schemas/types";
import { z } from "zod";
import {
  challengeDifficultySchema,
  cliMetadataSchema,
  objectiveSchema,
  submitBodySchema,
} from "../schemas/index";
import { syncRequestSchema } from "../schemas/sync";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const errorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

const commonErrors = {
  400: {
    description: "Bad request",
    content: { "application/json": { schema: errorSchema } },
  },
  401: {
    description: "Unauthorized",
    content: { "application/json": { schema: errorSchema } },
  },
  500: {
    description: "Internal server error",
    content: { "application/json": { schema: errorSchema } },
  },
} as const;

const notFound = {
  description: "Not found",
  content: { "application/json": { schema: errorSchema } },
};

const bearerAuth = [{ BearerAuth: [] }];
const sessionAuth = [{ SessionAuth: [] }];
const slugParam = z.object({ slug: z.string() });

// ---------------------------------------------------------------------------
// Challenges
// ---------------------------------------------------------------------------

const submitSuccessSchema = z.object({
  success: z.literal(true),
  objectives: z.array(objectiveSchema),
});

const submitFailureSchema = z.object({
  success: z.literal(false),
  objectives: z.array(objectiveSchema),
  failedObjectives: z.array(
    z.object({ id: z.string(), name: z.string(), message: z.string() }),
  ),
});

const getChallengesRoute = createRoute({
  method: "get",
  path: "/api/challenges",
  operationId: "listChallenges",
  summary: "List challenges",
  tags: ["Challenges"],
  security: sessionAuth,
  request: {
    query: z.object({
      difficulty: challengeDifficultySchema.optional(),
      type: z.string().optional(),
      theme: z.string().optional(),
      search: z.string().optional(),
      showCompleted: z.enum(["true", "false"]).optional(),
    }),
  },
  responses: {
    200: {
      description: "Challenge list",
      content: { "application/json": { schema: ChallengeListOutputSchema } },
    },
    ...commonErrors,
  },
});

const getChallengeRoute = createRoute({
  method: "get",
  path: "/api/challenges/{slug}",
  operationId: "getChallenge",
  summary: "Get challenge details",
  tags: ["Challenges"],
  request: { params: slugParam },
  responses: {
    200: {
      description: "Challenge details",
      content: {
        "application/json": {
          schema: z.object({ challenge: ChallengeDetailSchema.nullable() }),
        },
      },
    },
    ...commonErrors,
  },
});

const getChallengeObjectivesRoute = createRoute({
  method: "get",
  path: "/api/challenges/{slug}/objectives",
  operationId: "getChallengeObjectives",
  summary: "Get challenge objectives",
  tags: ["Challenges"],
  request: { params: slugParam },
  responses: {
    200: {
      description: "Challenge objectives",
      content: {
        "application/json": { schema: ChallengeGetObjectivesOutputSchema },
      },
    },
    ...commonErrors,
  },
});

const submitChallengeRoute = createRoute({
  method: "post",
  path: "/api/challenges/{slug}/submit",
  operationId: "submitChallenge",
  summary: "Submit challenge validation results",
  tags: ["Challenges"],
  security: sessionAuth,
  request: {
    params: slugParam,
    body: {
      required: true,
      content: { "application/json": { schema: submitBodySchema } },
    },
  },
  responses: {
    200: {
      description: "All objectives passed",
      content: { "application/json": { schema: submitSuccessSchema } },
    },
    409: {
      description: "Challenge already completed",
      content: { "application/json": { schema: errorSchema } },
    },
    422: {
      description: "Some objectives failed or missing/unknown objectives",
      content: {
        "application/json": {
          schema: z.union([submitFailureSchema, errorSchema]),
        },
      },
    },
    404: notFound,
    ...commonErrors,
  },
});

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

const getCompletionRoute = createRoute({
  method: "get",
  path: "/api/progress/completion",
  operationId: "getCompletion",
  summary: "Get challenge completion stats",
  tags: ["Progress"],
  security: sessionAuth,
  request: {
    query: z.object({
      splitByTheme: z.enum(["true", "false"]).optional(),
      themeSlug: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Completion stats",
      content: {
        "application/json": { schema: CompletionPercentageOutputSchema },
      },
    },
    ...commonErrors,
  },
});

const getChallengeStatusRoute = createRoute({
  method: "get",
  path: "/api/progress/{slug}",
  operationId: "getChallengeStatus",
  summary: "Get challenge progress",
  tags: ["Progress"],
  security: sessionAuth,
  request: { params: slugParam },
  responses: {
    200: {
      description: "Challenge progress",
      content: { "application/json": { schema: GetStatusOutputSchema } },
    },
    404: notFound,
    ...commonErrors,
  },
});

const startChallengeRoute = createRoute({
  method: "post",
  path: "/api/progress/{slug}/start",
  operationId: "startChallenge",
  summary: "Start a challenge",
  tags: ["Progress"],
  security: sessionAuth,
  request: { params: slugParam },
  responses: {
    200: {
      description: "Challenge started",
      content: { "application/json": { schema: StartChallengeOutputSchema } },
    },
    404: notFound,
    ...commonErrors,
  },
});

const resetChallengeRoute = createRoute({
  method: "post",
  path: "/api/progress/{slug}/reset",
  operationId: "resetChallenge",
  summary: "Reset challenge progress",
  tags: ["Progress"],
  security: sessionAuth,
  request: { params: slugParam },
  responses: {
    200: {
      description: "Progress reset",
      content: { "application/json": { schema: ResetChallengeOutputSchema } },
    },
    404: notFound,
    ...commonErrors,
  },
});

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

const submissionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  challengeId: z.number().int(),
  validated: z.boolean(),
  objectives: z.array(objectiveSchema).nullable(),
  timestamp: z.string().describe("ISO 8601 date string"),
});

const getSubmissionsRoute = createRoute({
  method: "get",
  path: "/api/submissions/{slug}",
  operationId: "getSubmissions",
  summary: "Get all submissions for a challenge",
  tags: ["Submissions"],
  security: sessionAuth,
  request: { params: slugParam },
  responses: {
    200: {
      description: "Submission list",
      content: {
        "application/json": {
          schema: z.object({ submissions: z.array(submissionSchema) }),
        },
      },
    },
    404: notFound,
    ...commonErrors,
  },
});

const getLatestSubmissionRoute = createRoute({
  method: "get",
  path: "/api/submissions/{slug}/latest",
  operationId: "getLatestSubmission",
  summary: "Get latest submission status for a challenge",
  tags: ["Submissions"],
  security: sessionAuth,
  request: { params: slugParam },
  responses: {
    200: {
      description: "Latest submission status",
      content: {
        "application/json": {
          schema: z.object({
            hasSubmission: z.boolean(),
            validated: z.boolean(),
            objectives: z.array(objectiveSchema).nullable(),
            timestamp: z.string().nullable().describe("ISO 8601 date string"),
          }),
        },
      },
    },
    404: notFound,
    ...commonErrors,
  },
});

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

const getUserXpRoute = createRoute({
  method: "get",
  path: "/api/user/xp",
  operationId: "getUserXp",
  summary: "Get XP and rank info",
  tags: ["XP"],
  security: sessionAuth,
  responses: {
    200: {
      description: "XP and rank",
      content: { "application/json": { schema: XpAndRankOutputSchema } },
    },
    ...commonErrors,
  },
});

const getUserStreakRoute = createRoute({
  method: "get",
  path: "/api/user/streak",
  operationId: "getUserStreak",
  summary: "Get current challenge streak",
  tags: ["XP"],
  security: sessionAuth,
  responses: {
    200: {
      description: "Streak info",
      content: { "application/json": { schema: StreakOutputSchema } },
    },
    ...commonErrors,
  },
});

const updateUserNameRoute = createRoute({
  method: "patch",
  path: "/api/user/name",
  operationId: "updateUserName",
  summary: "Update user display name",
  tags: ["User"],
  security: sessionAuth,
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            firstName: z.string().min(1),
            lastName: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Name updated",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), name: z.string() }),
        },
      },
    },
    ...commonErrors,
  },
});

const deleteUserProgressRoute = createRoute({
  method: "delete",
  path: "/api/user/progress",
  operationId: "deleteUserProgress",
  summary: "Delete all user progress and XP",
  tags: ["XP"],
  security: sessionAuth,
  responses: {
    200: {
      description: "Progress deleted",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            deletedChallenges: z.number().int(),
            deletedXp: z.number().int(),
          }),
        },
      },
    },
    ...commonErrors,
  },
});

const emailTopicSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  defaultSubscription: z.string(),
  subscribed: z.boolean(),
});

const getEmailTopicsRoute = createRoute({
  method: "get",
  path: "/api/user/email-topics",
  operationId: "getEmailTopics",
  summary: "List email topics with subscription status",
  tags: ["User"],
  security: sessionAuth,
  responses: {
    200: {
      description: "Email topics",
      content: {
        "application/json": { schema: z.array(emailTopicSchema) },
      },
    },
    ...commonErrors,
  },
});

const updateEmailTopicRoute = createRoute({
  method: "patch",
  path: "/api/user/email-topics/{topicId}",
  operationId: "updateEmailTopic",
  summary: "Update email subscription for a topic",
  tags: ["User"],
  security: sessionAuth,
  request: {
    params: z.object({ topicId: z.string() }),
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({ subscribed: z.boolean() }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Subscription updated",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    ...commonErrors,
  },
});

// ---------------------------------------------------------------------------
// XP
// ---------------------------------------------------------------------------

const xpHistoryItemSchema = z.object({
  id: z.string(),
  action: z.string(),
  xpAmount: z.number().int(),
  description: z.string().nullable(),
  createdAt: z.string().describe("ISO 8601 date string"),
  challengeId: z.number().int().nullable(),
  challengeTitle: z.string().nullable(),
  challengeSlug: z.string().nullable(),
  challengeDifficulty: z.string().nullable(),
});

const getXpHistoryRoute = createRoute({
  method: "get",
  path: "/api/xp/history",
  operationId: "getXpHistory",
  summary: "Get last 20 XP transactions",
  tags: ["XP"],
  security: sessionAuth,
  responses: {
    200: {
      description: "XP history",
      content: {
        "application/json": { schema: z.array(xpHistoryItemSchema) },
      },
    },
    ...commonErrors,
  },
});

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

const onboardingStatusSchema = z.object({
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

const getOnboardingRoute = createRoute({
  method: "get",
  path: "/api/onboarding",
  operationId: "getOnboarding",
  summary: "Get onboarding status",
  tags: ["Onboarding"],
  security: sessionAuth,
  responses: {
    200: {
      description: "Onboarding status",
      content: { "application/json": { schema: onboardingStatusSchema } },
    },
    ...commonErrors,
  },
});

const onboardingActionRoute = (
  path: string,
  operationId: string,
  summary: string,
) =>
  createRoute({
    method: "post",
    path,
    operationId,
    summary,
    tags: ["Onboarding"],
    security: sessionAuth,
    responses: {
      200: {
        description: "Success",
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean() }),
          },
        },
      },
      ...commonErrors,
    },
  });

const startOnboardingRoute = onboardingActionRoute(
  "/api/onboarding/start",
  "startOnboarding",
  "Start onboarding",
);
const completeOnboardingRoute = onboardingActionRoute(
  "/api/onboarding/complete",
  "completeOnboarding",
  "Mark onboarding as completed",
);
const skipOnboardingRoute = onboardingActionRoute(
  "/api/onboarding/skip",
  "skipOnboarding",
  "Skip onboarding",
);

// ---------------------------------------------------------------------------
// Metadata (no auth)
// ---------------------------------------------------------------------------

const getTypesRoute = createRoute({
  method: "get",
  path: "/api/types",
  operationId: "getTypes",
  summary: "List challenge types",
  tags: ["Metadata"],
  responses: {
    200: {
      description: "Challenge types",
      content: { "application/json": { schema: z.array(TypeSchema) } },
    },
    ...commonErrors,
  },
});

const getThemesRoute = createRoute({
  method: "get",
  path: "/api/themes",
  operationId: "getThemes",
  summary: "List challenge themes",
  tags: ["Metadata"],
  responses: {
    200: {
      description: "Challenge themes",
      content: { "application/json": { schema: z.array(ThemeSchema) } },
    },
    ...commonErrors,
  },
});

// ---------------------------------------------------------------------------
// Deprecated CLI routes
// ---------------------------------------------------------------------------

const userNameSchema = z.object({
  firstName: z.string(),
  lastName: z.string().nullable(),
});

const deprecatedGetUserRoute = createRoute({
  method: "get",
  path: "/api/cli/user",
  operationId: "getUser",
  summary: "Get current user",
  deprecated: true,
  tags: ["Deprecated"],
  security: bearerAuth,
  responses: {
    200: {
      description: "User profile",
      content: { "application/json": { schema: userNameSchema } },
    },
    ...commonErrors,
  },
});

const deprecatedLoginUserRoute = createRoute({
  method: "post",
  path: "/api/cli/user",
  operationId: "loginUser",
  summary: "Authenticate CLI and track metadata",
  deprecated: true,
  tags: ["Deprecated"],
  security: bearerAuth,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: cliMetadataSchema } },
    },
  },
  responses: {
    200: {
      description: "User profile with first-login flag",
      content: {
        "application/json": {
          schema: userNameSchema.extend({ firstLogin: z.boolean() }),
        },
      },
    },
    ...commonErrors,
  },
});

const deprecatedTrackSetupRoute = createRoute({
  method: "post",
  path: "/api/cli/track/setup",
  operationId: "trackSetup",
  summary: "Track CLI cluster initialisation",
  deprecated: true,
  tags: ["Deprecated"],
  security: bearerAuth,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: cliMetadataSchema } },
    },
  },
  responses: {
    200: {
      description: "Setup tracked",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), firstTime: z.boolean() }),
        },
      },
    },
    ...commonErrors,
  },
});

// ---------------------------------------------------------------------------
// Public API app — spec-only, never mounted in main router
// ---------------------------------------------------------------------------

export const apiApp = new OpenAPIHono();

apiApp.openAPIRegistry.registerComponent("securitySchemes", "SessionAuth", {
  type: "apiKey",
  in: "cookie",
  name: "better-auth.session_token",
  description: "Session cookie set after login via better-auth",
});

apiApp.openAPIRegistry.registerComponent("securitySchemes", "BearerAuth", {
  type: "http",
  scheme: "bearer",
  description: "API key obtained via `kubeasy login` (deprecated CLI auth)",
});

// Stub handler: these routes are never served — the app is only used for
// spec generation via apiApp.getOpenAPI31Document()
const stub = (() => null) as never;

// Challenges
apiApp.openapi(getChallengesRoute, stub);
apiApp.openapi(getChallengeRoute, stub);
apiApp.openapi(getChallengeObjectivesRoute, stub);
apiApp.openapi(submitChallengeRoute, stub);
// Progress
apiApp.openapi(getCompletionRoute, stub);
apiApp.openapi(getChallengeStatusRoute, stub);
apiApp.openapi(startChallengeRoute, stub);
apiApp.openapi(resetChallengeRoute, stub);
// Submissions
apiApp.openapi(getSubmissionsRoute, stub);
apiApp.openapi(getLatestSubmissionRoute, stub);
// User
apiApp.openapi(getUserXpRoute, stub);
apiApp.openapi(getUserStreakRoute, stub);
apiApp.openapi(updateUserNameRoute, stub);
apiApp.openapi(deleteUserProgressRoute, stub);
apiApp.openapi(getEmailTopicsRoute, stub);
apiApp.openapi(updateEmailTopicRoute, stub);
// XP
apiApp.openapi(getXpHistoryRoute, stub);
// Onboarding
apiApp.openapi(getOnboardingRoute, stub);
apiApp.openapi(startOnboardingRoute, stub);
apiApp.openapi(completeOnboardingRoute, stub);
apiApp.openapi(skipOnboardingRoute, stub);
// Metadata
apiApp.openapi(getTypesRoute, stub);
apiApp.openapi(getThemesRoute, stub);
// Deprecated
apiApp.openapi(deprecatedGetUserRoute, stub);
apiApp.openapi(deprecatedLoginUserRoute, stub);
apiApp.openapi(deprecatedTrackSetupRoute, stub);

// ---------------------------------------------------------------------------
// Sync API — route definitions
// ---------------------------------------------------------------------------

const syncChallengesRoute = createRoute({
  method: "post",
  path: "/api/admin/challenges/sync",
  operationId: "syncChallenges",
  summary: "Sync all challenges from source of truth",
  description:
    "Full upsert/delete sync of challenges and their objectives. Intended to be called from CI/CD after merging to the challenges repository.",
  tags: ["Sync"],
  security: bearerAuth,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: syncRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Sync completed",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            created: z.number().int(),
            updated: z.number().int(),
            deleted: z.number().int(),
            details: z.object({
              created: z.array(z.string()),
              updated: z.array(z.string()),
              deleted: z.array(z.string()),
            }),
          }),
        },
      },
    },
    ...commonErrors,
  },
});

// ---------------------------------------------------------------------------
// Sync API app — spec-only, never mounted in main router
// ---------------------------------------------------------------------------

export const syncApiApp = new OpenAPIHono();

syncApiApp.openAPIRegistry.registerComponent("securitySchemes", "BearerAuth", {
  type: "http",
  scheme: "bearer",
  description: "API key with admin privileges",
});

syncApiApp.openapi(syncChallengesRoute, stub);
