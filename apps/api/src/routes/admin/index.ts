import { Hono } from "hono";
import { requireAdmin } from "../../middleware/admin";
import type { AppEnv } from "../../middleware/session";
import { adminChallenges } from "./challenges";
import { adminUsers } from "./users";

const admin = new Hono<AppEnv>();

admin.use("/*", requireAdmin);

admin.route("/challenges", adminChallenges);
admin.route("/users", adminUsers);

export { admin };
