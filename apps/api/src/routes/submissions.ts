import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/index.js";
import { challenge, userSubmission } from "../db/schema/index.js";
import { requireAuth } from "../middleware/session.js";

const submissions = new Hono();

// GET /submissions/:slug -- get all submissions for a challenge by the current user
submissions.get("/:slug", requireAuth, async (c) => {
  const user = c.get("user");
  const slug = c.req.param("slug");

  // Get challenge ID from slug
  const [challengeData] = await db
    .select({ id: challenge.id })
    .from(challenge)
    .where(eq(challenge.slug, slug))
    .limit(1);

  if (!challengeData) {
    return c.json({ error: "Challenge not found" }, 404);
  }

  // Get all submissions for this challenge by this user, ordered by most recent first
  const submissionsList = await db
    .select()
    .from(userSubmission)
    .where(
      and(
        eq(userSubmission.userId, user.id),
        eq(userSubmission.challengeId, challengeData.id),
      ),
    )
    .orderBy(desc(userSubmission.timestamp));

  return c.json({ submissions: submissionsList });
});

// GET /submissions/:slug/latest -- get the latest validation status for a challenge
submissions.get("/:slug/latest", requireAuth, async (c) => {
  const user = c.get("user");
  const slug = c.req.param("slug");

  // Get challenge ID from slug
  const [challengeData] = await db
    .select({ id: challenge.id })
    .from(challenge)
    .where(eq(challenge.slug, slug))
    .limit(1);

  if (!challengeData) {
    return c.json({ error: "Challenge not found" }, 404);
  }

  // Get the most recent submission for this challenge by this user
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
        eq(userSubmission.challengeId, challengeData.id),
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

  const objectives = latestSubmission.objectives as Array<{
    id: string;
    name: string;
    description?: string;
    passed: boolean;
    category: string;
    message: string;
  }> | null;

  return c.json({
    hasSubmission: true,
    validated: latestSubmission.validated,
    objectives,
    timestamp: latestSubmission.timestamp,
  });
});

export { submissions };
