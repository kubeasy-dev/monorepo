import { Hono } from "hono";
import { requireAdmin } from "../../middleware/admin";
import { adminChallenges } from "./challenges";
import { adminUsers } from "./users";

const admin = new Hono();

admin.use("/*", requireAdmin);

admin.route("/challenges", adminChallenges);
admin.route("/users", adminUsers);

export { admin };
