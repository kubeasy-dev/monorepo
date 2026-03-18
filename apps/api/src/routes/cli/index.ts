import { Hono } from "hono";
import { submit } from "../submit.js";

const cli = new Hono();

// Mount the submit routes under /cli/challenges
// This makes POST /api/cli/challenges/:slug/submit available
cli.route("/challenges", submit);

export { cli };
