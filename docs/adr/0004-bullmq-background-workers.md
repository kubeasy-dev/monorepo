# BullMQ + Redis for background job processing

Async work (challenge submission processing, user signup side-effects, XP awarding) runs in BullMQ workers backed by Redis, not inline in request handlers. This prevents slow or flaky operations (Resend emails, PostHog events, XP calculation) from adding latency to the submission endpoint. Workers live in `apps/api/src/workers/` and are started in the same Node.js process as the HTTP server. Job definitions and queue names live in the shared `@kubeasy/jobs` package so web and API can enqueue without importing worker code.

## Consequences

The Redis instance is a required runtime dependency — the API won't start without it.
