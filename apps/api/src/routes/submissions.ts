import type { Objective } from "@kubeasy/api-schemas/submissions";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/index";
import { userSubmission } from "../db/schema/index";
import { getChallenge } from "../lib/registry";
import { requireAuth } from "../middleware/session";

const submissions = new Hono();

// GET /submissions/:slug -- get all submissions for a challenge by the current user
submissions.get("/:slug", requireAuth, async (c) => {
  const user = c.get("user");
  const slug = c.req.param("slug");

  const detail = await getChallenge(slug);
  if (!detail) {
    return c.json({ error: "Challenge not found" }, 404);
  }

  const submissionsList = await db
    .select()
    .from(userSubmission)
    .where(
      and(
        eq(userSubmission.userId, user.id),
        eq(userSubmission.challengeSlug, slug),
      ),
    )
    .orderBy(desc(userSubmission.timestamp));

  return c.json({ submissions: submissionsList });
});

// GET /submissions/:slug/latest -- get the latest validation status for a challenge
submissions.get("/:slug/latest", requireAuth, async (c) => {
  const user = c.get("user");
  const slug = c.req.param("slug");

  const detail = await getChallenge(slug);
  if (!detail) {
    return c.json({ error: "Challenge not found" }, 404);
  }

  const [latestSubmission] = await db
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
    .limit(1);

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
});

export { submissions };
