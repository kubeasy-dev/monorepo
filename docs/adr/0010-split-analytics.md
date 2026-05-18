# Split analytics: Umami (client-side) + PostHog (server-side only)

Frontend analytics (page views, user interactions) use [Umami](https://umami.is/) loaded via a script tag. Server-side analytics (challenge submissions, user lifecycle events) use PostHog via `posthog-node`. The split happened when we migrated the web app away from PostHog's JS client: PostHog's browser SDK added meaningful bundle weight and introduced GDPR consent complexity. Umami is privacy-first and self-hostable, with no cookie banner requirement. PostHog is kept on the server side because its funnel and cohort analysis is valuable for product decisions and it has no client-side footprint there.

## Consequence

Do not add `posthog-js` back to the web app. If richer product analytics on the client are needed, evaluate whether Umami's event tracking covers the use case first.
