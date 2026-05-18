import { Hono } from "hono";
import { requireAdmin } from "../../middleware/admin";
import type { AppEnv } from "../../middleware/session";
import { adminAnalytics } from "./analytics";
import { adminChallenges } from "./challenges";
import { adminUsers } from "./users";

export const admin = new Hono<AppEnv>()
  .use("/*", requireAdmin)
  .route("/analytics", adminAnalytics)
  .route("/challenges", adminChallenges)
  .route("/users", adminUsers);
