import { Hono } from "hono";
import { apiKeyMiddleware } from "../../middleware/api-key.js";
import { submit } from "../submit.js";

const cli = new Hono();

// API key auth required for all CLI routes (replaces session cookie auth)
cli.use("/*", apiKeyMiddleware);

// Mount the submit routes under /cli/challenges
// This makes POST /api/cli/challenges/:slug/submit available
cli.route("/challenges", submit);

export { cli };
