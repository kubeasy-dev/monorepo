import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  ChallengeDetailSchema,
  ChallengeFiltersSchema,
  ChallengeListOutputSchema,
} from "@kubeasy/api-schemas/challenges";
import { CliMetadataSchema } from "@kubeasy/api-schemas/cli";
import {
  GetStatusOutputSchema,
  ResetChallengeOutputSchema,
  StartChallengeOutputSchema,
} from "@kubeasy/api-schemas/progress";
import { RegistryMetaSchema } from "@kubeasy/api-schemas/registry";
import {
  ObjectiveSchema,
  SubmitBodySchema,
} from "@kubeasy/api-schemas/submissions";
import { z } from "zod";

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

const bearerAuth: Record<string, string[]>[] = [{ BearerAuth: [] }];
const sessionOrBearerAuth: Record<string, string[]>[] = [
  { SessionAuth: [] },
  { BearerAuth: [] },
];
const slugParam = z.object({ slug: z.string() });

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const getUserMeRoute = createRoute({
  method: "get",
  path: "/api/user/me",
  operationId: "getUserMe",
  summary: "Get current user profile",
  tags: ["CLI"],
  security: bearerAuth,
  responses: {
    200: {
      description: "User profile",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            email: z.string(),
            name: z.string(),
            image: z.string().nullable().optional(),
          }),
        },
      },
    },
    ...commonErrors,
  },
});

const listChallengesRoute = createRoute({
  method: "get",
  path: "/api/challenges",
  operationId: "listChallenges",
  summary: "List challenges",
  tags: ["CLI"],
  security: [...sessionOrBearerAuth, {}],
  request: {
    query: ChallengeFiltersSchema,
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
  tags: ["CLI"],
  security: [],
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

const getChallengeMetaRoute = createRoute({
  method: "get",
  path: "/api/challenges/meta",
  operationId: "getChallengeMeta",
  summary: "Get challenge metadata (themes, types, difficulties)",
  tags: ["CLI"],
  responses: {
    200: {
      description: "Metadata",
      content: { "application/json": { schema: RegistryMetaSchema } },
    },
    ...commonErrors,
  },
});

const getChallengeYamlRoute = createRoute({
  method: "get",
  path: "/api/challenges/{slug}/yaml",
  operationId: "getChallengeYaml",
  summary: "Get challenge.yaml",
  tags: ["CLI"],
  request: { params: slugParam },
  responses: {
    200: {
      description: "Raw YAML",
      content: { "text/plain": { schema: z.string() } },
    },
    404: notFound,
    ...commonErrors,
  },
});

const getChallengeManifestsRoute = createRoute({
  method: "get",
  path: "/api/challenges/{slug}/manifests",
  operationId: "getChallengeManifests",
  summary: "Get challenge manifests tar.gz",
  tags: ["CLI"],
  request: { params: slugParam },
  responses: {
    200: {
      description: "Binary data",
      content: {
        "application/gzip": {
          schema: {
            type: "string",
            format: "binary",
          },
        },
      },
    },
    404: notFound,
    ...commonErrors,
  },
});

const getChallengeStatusRoute = createRoute({
  method: "get",
  path: "/api/progress/{slug}",
  operationId: "getChallengeStatus",
  summary: "Get challenge progress",
  tags: ["CLI"],
  security: sessionOrBearerAuth,
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
  tags: ["CLI"],
  security: sessionOrBearerAuth,
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
  tags: ["CLI"],
  security: sessionOrBearerAuth,
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

const submitChallengeRoute = createRoute({
  method: "post",
  path: "/api/challenges/{slug}/submit",
  operationId: "submitChallenge",
  summary: "Submit challenge validation results",
  tags: ["CLI"],
  security: sessionOrBearerAuth,
  request: {
    params: slugParam,
    body: {
      required: true,
      content: { "application/json": { schema: SubmitBodySchema } },
    },
  },
  responses: {
    200: {
      description: "All objectives passed",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            objectives: z.array(ObjectiveSchema),
          }),
        },
      },
    },
    409: {
      description: "Challenge already completed",
      content: { "application/json": { schema: errorSchema } },
    },
    422: {
      description: "Some objectives failed or missing/unknown objectives",
      content: {
        "application/json": {
          schema: z.union([
            z.object({
              success: z.literal(false),
              objectives: z.array(ObjectiveSchema),
              failedObjectives: z.array(
                z.object({
                  key: z.string(),
                  title: z.string(),
                  message: z.string(),
                }),
              ),
            }),
            errorSchema,
          ]),
        },
      },
    },
    404: notFound,
    ...commonErrors,
  },
});

const trackCliLoginRoute = createRoute({
  method: "post",
  path: "/api/cli/track/login",
  operationId: "trackCliLogin",
  summary: "Track CLI login and metadata",
  tags: ["CLI"],
  security: bearerAuth,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: CliMetadataSchema } },
    },
  },
  responses: {
    200: {
      description: "Login tracked",
      content: {
        "application/json": {
          schema: z.object({ firstLogin: z.boolean() }),
        },
      },
    },
    ...commonErrors,
  },
});

const trackSetupRoute = createRoute({
  method: "post",
  path: "/api/cli/track/setup",
  operationId: "trackSetup",
  summary: "Track CLI cluster initialisation",
  tags: ["CLI"],
  security: bearerAuth,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: CliMetadataSchema } },
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
// App definition
// ---------------------------------------------------------------------------

export const cliApp = new OpenAPIHono();

cliApp.openAPIRegistry.registerComponent("securitySchemes", "SessionAuth", {
  type: "apiKey",
  in: "cookie",
  name: "better-auth.session_token",
  description: "Session cookie set after login via better-auth",
});

cliApp.openAPIRegistry.registerComponent("securitySchemes", "BearerAuth", {
  type: "http",
  scheme: "bearer",
  description:
    "API key obtained via `kubeasy login`. Used by the CLI and accepted on all public API routes.",
});

const stub = (() => null) as never;

cliApp.openapi(getUserMeRoute, stub);
cliApp.openapi(listChallengesRoute, stub);
cliApp.openapi(getChallengeRoute, stub);
cliApp.openapi(getChallengeMetaRoute, stub);
cliApp.openapi(getChallengeYamlRoute, stub);
cliApp.openapi(getChallengeManifestsRoute, stub);
cliApp.openapi(getChallengeStatusRoute, stub);
cliApp.openapi(startChallengeRoute, stub);
cliApp.openapi(resetChallengeRoute, stub);
cliApp.openapi(submitChallengeRoute, stub);
cliApp.openapi(trackCliLoginRoute, stub);
cliApp.openapi(trackSetupRoute, stub);
