import { Hono } from "hono";
import { challenges } from "../challenges";
import { progress } from "../progress";
import { submit } from "../submit";

/**
 * Legacy CLI route aliases — maps old singular /challenge/:slug/* paths
 * to the current handlers without duplicating any logic.
 *
 * Old CLI paths → current handler
 *   GET  /challenge/:slug          → challenges GET /:slug (detail)
 *   GET  /challenge/:slug/status   → progress GET /:slug/status (alias added in progress.ts)
 *   POST /challenge/:slug/start    → progress POST /:slug/start
 *   POST /challenge/:slug/reset    → progress POST /:slug/reset (alias added in progress.ts)
 *   POST /challenge/:slug/submit   → submit POST /:slug/submit
 *
 * Mount order matters: challenges is first so its GET /:slug (detail) wins
 * over progress's GET /:slug (status) for the bare slug path.
 */
const legacyCli = new Hono();

legacyCli.route("/", challenges); // GET /:slug → detail (registered first, wins)
legacyCli.route("/", progress); // GET /:slug/status, POST /:slug/start, POST+DELETE /:slug/reset
legacyCli.route("/", submit); // POST /:slug/submit

export { legacyCli };
