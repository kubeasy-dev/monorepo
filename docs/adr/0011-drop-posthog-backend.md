# Drop PostHog backend — analytics served from PostgreSQL

PostHog backend (`posthog-node`) is removed from the API. All funnel metrics (signup → challenge started → challenge completed) and per-challenge stats (completion rate, average attempts, failed objectives) are derived directly from existing PostgreSQL tables (`user`, `user_progress`, `user_submission`). The only events not already covered by the schema — `cli_login` and `cli_setup` — are captured in a new `cli_events` table (append-only: `userId`, `eventType`, `cliVersion`, `os`, `arch`, `timestamp`). Exception tracking stays on OTel, which already covers it.

## Considered options

- **ClickHouse** — evaluated for both analytics and kubectl audit event storage. Rejected: the event volume doesn't justify the operational overhead of a separate OLAP store, and audit events are already stored as JSONB on `userSubmission`. PostgreSQL handles the required aggregation queries without issue.
- **Keep PostHog** — rejected: funnel and challenge stats are fully derivable from PostgreSQL, exceptions are covered by OTel, and the dependency adds operational cost (env vars, flush lifecycle, dev/prod parity) for no remaining benefit.
