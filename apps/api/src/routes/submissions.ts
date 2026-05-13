import { LatestValidationStatusOutputSchema } from "@kubeasy/api-schemas/progress";
import {
  type Objective,
  SubmissionRecordSchema,
} from "@kubeasy/api-schemas/submissions";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import { db } from "../db/index";
import { userSubmission } from "../db/schema/index";
import { sessionSecurity } from "../lib/openapi-shared";
import { getChallenge } from "../lib/registry";
import { type AppEnv, requireAuth } from "../middleware/session";

const slugParam = z.object({ slug: z.string() });
const SubmissionsOutputSchema = z.object({
  submissions: z.array(SubmissionRecordSchema),
});

export const submissions = new Hono<AppEnv>()
  .get(
    "/:slug",
    describeRoute({
      tags: ["Submissions"],
      summary: "List user submissions for a challenge",
      security: sessionSecurity,
      responses: {
        200: {
          description: "Submissions",
          content: {
            "application/json": { schema: resolver(SubmissionsOutputSchema) },
          },
        },
        404: { description: "Challenge not found" },
      },
    }),
    requireAuth,
    validator("param", slugParam),
    async (c) => {
      const user = c.get("user");
      const { slug } = c.req.valid("param");

      const [detail, submissionsList] = await Promise.all([
        getChallenge(slug),
        db
          .select()
          .from(userSubmission)
          .where(
            and(
              eq(userSubmission.userId, user.id),
              eq(userSubmission.challengeSlug, slug),
            ),
          )
          .orderBy(desc(userSubmission.timestamp)),
      ]);

      if (!detail) {
        return c.json({ error: "Challenge not found" }, 404);
      }

      return c.json({ submissions: submissionsList });
    },
  )
  .get(
    "/:slug/latest",
    describeRoute({
      tags: ["Submissions"],
      summary: "Latest validation status for a challenge",
      security: sessionSecurity,
      responses: {
        200: {
          description: "Latest validation",
          content: {
            "application/json": {
              schema: resolver(LatestValidationStatusOutputSchema),
            },
          },
        },
        404: { description: "Challenge not found" },
      },
    }),
    requireAuth,
    validator("param", slugParam),
    async (c) => {
      const user = c.get("user");
      const { slug } = c.req.valid("param");

      const [detail, [latestSubmission]] = await Promise.all([
        getChallenge(slug),
        db
          .select({
            id: userSubmission.id,
            timestamp: userSubmission.timestamp,
            validated: userSubmission.validated,
            objectives: userSubmission.objectives,
          })
          .from(userSubmission)
          .where(
            and(
              eq(userSubmission.userId, user.id),
              eq(userSubmission.challengeSlug, slug),
            ),
          )
          .orderBy(desc(userSubmission.timestamp))
          .limit(1),
      ]);

      if (!detail) {
        return c.json({ error: "Challenge not found" }, 404);
      }

      if (!latestSubmission) {
        return c.json({
          hasSubmission: false,
          objectives: null,
          timestamp: null,
          validated: false,
        });
      }

      const objectives = latestSubmission.objectives as Objective[] | null;

      return c.json({
        hasSubmission: true,
        validated: latestSubmission.validated,
        objectives,
        timestamp: latestSubmission.timestamp,
      });
    },
  );
