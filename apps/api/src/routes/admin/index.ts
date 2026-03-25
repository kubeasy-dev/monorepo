import { Hono } from "hono";
import { requireAdmin } from "../../middleware/admin";
import { apiKeyMiddleware } from "../../middleware/api-key";
import { adminChallenges } from "./challenges";
import { challengesSync } from "./challenges-sync";

/**
 * Admin routes — all require API key auth + admin role.
 * Mounted at /api/admin
 */
const admin = new Hono();

// /challenges/sync is called by CI/CD scripts with an API key (not a session cookie).
// Register apiKeyMiddleware BEFORE requireAdmin (Hono executes middleware in order).
admin.use("/challenges/sync/*", apiKeyMiddleware);

// Enforce admin role on all /admin routes.
// For session-based routes: user is already set by the global sessionMiddleware.
// For /challenges/sync: user is set above by apiKeyMiddleware.
admin.use("/*", requireAdmin);

admin.route("/challenges/sync", challengesSync);
admin.route("/challenges", adminChallenges);

export { admin };
