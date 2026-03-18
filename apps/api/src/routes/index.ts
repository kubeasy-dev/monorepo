import { Hono } from "hono";
import { challenges } from "./challenges.js";
import { cli } from "./cli/index.js";
import { progress } from "./progress.js";
import { submissions } from "./submissions.js";
import { submit } from "./submit.js";
import { themes } from "./themes.js";
import { types } from "./types.js";
import { user } from "./user.js";
import { xp } from "./xp.js";

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

export { routes };
