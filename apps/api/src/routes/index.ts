import { Hono } from "hono";
import { admin } from "./admin/index";
import { challenges } from "./challenges";
import { cli } from "./cli/index";
import { onboarding } from "./onboarding";
import { progress } from "./progress";
import { sse } from "./sse";
import { submissions } from "./submissions";
import { submit } from "./submit";
import { user } from "./user";
import { xp } from "./xp";

// Routes are chained so that the inferred type captures every sub-route.
// This is what enables end-to-end type-safety via `hc<AppType>` on the client
// and is also what lets `hono-openapi` walk the tree to generate the spec.
export const routes = new Hono()
  .get("/health", (c) => c.json({ status: "ok" }))
  .route("/challenges", challenges)
  .route("/challenges", submit)
  .route("/progress", progress)
  .route("/submissions", submissions)
  .route("/user", user)
  .route("/xp", xp)
  .route("/cli", cli)
  .route("/sse", sse)
  .route("/onboarding", onboarding)
  .route("/admin", admin);
