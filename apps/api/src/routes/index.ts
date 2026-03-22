import { Hono } from "hono";
import { admin } from "./admin/index";
import { challenges } from "./challenges";
import { cli } from "./cli/index";
import { onboarding } from "./onboarding";
import { progress } from "./progress";
import { sse } from "./sse";
import { submissions } from "./submissions";
import { submit } from "./submit";
import { themes } from "./themes";
import { types } from "./types";
import { user } from "./user";
import { xp } from "./xp";

const routes = new Hono();

// Health check
routes.get("/health", (c) => c.json({ status: "ok" }));

// Mount route groups
routes.route("/challenges", challenges);
routes.route("/challenges", submit); // POST /challenges/:slug/submit
routes.route("/themes", themes);
routes.route("/types", types);
routes.route("/progress", progress);
routes.route("/submissions", submissions);
routes.route("/user", user);
routes.route("/xp", xp);
routes.route("/cli", cli);
routes.route("/sse", sse);
routes.route("/onboarding", onboarding);
routes.route("/admin", admin);

export { routes };
