# packages/jobs — CLAUDE.md

Centralized BullMQ job definitions for the Kubeasy background job system.

## Purpose

Provides a shared, typed contract between job producers (API routes) and job consumers (workers) so queue names, payload shapes, and factory functions stay in sync.

## Exports

```
@kubeasy/jobs               # Re-exports everything
@kubeasy/jobs/queue-names   # Queue name string constants
@kubeasy/jobs/payloads      # TypeScript types for each job payload
@kubeasy/jobs/factory       # Factory functions to enqueue jobs
```

## Usage

**Enqueue a job** (in an API route):
```typescript
import { jobFactory } from "@kubeasy/jobs/factory";
import { redis } from "../lib/redis";

await jobFactory.challengeSubmission(redis, {
  userId: "user-123",
  challengeSlug: "intro-to-pods",
  results: [...],
});
```

**Consume a job** (in a worker):
```typescript
import { Worker } from "bullmq";
import { QUEUE_NAMES } from "@kubeasy/jobs/queue-names";
import type { ChallengeSubmissionPayload } from "@kubeasy/jobs/payloads";

new Worker<ChallengeSubmissionPayload>(QUEUE_NAMES.CHALLENGE_SUBMISSION, async (job) => {
  const { userId, challengeSlug, results } = job.data;
  // ...
});
```

## Commands

```bash
pnpm typecheck   # Type-check this package
```

## Key Rules

- **Only used by `apps/api`** — not imported by the frontend.
- **No build step**: `apps/api` imports TypeScript source directly.
- **Dependency**: BullMQ 5.x is a direct dependency (not peer) since it provides the `Queue` and `Worker` types used in factory functions.
- When adding a new job type: add to `queue-names.ts`, `payloads.ts`, and `factory.ts`, then create the corresponding worker in `apps/api/src/workers/`.
