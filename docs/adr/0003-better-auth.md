# Better Auth for authentication

We use [Better Auth](https://www.better-auth.com/) for session management, OAuth (GitHub, Google, Microsoft), and user lifecycle events. Better Auth was chosen over Auth.js / NextAuth because it is framework-agnostic (works with Hono directly, not tied to Next.js), exposes a typed RPC client that works well with Hono RPC, and manages its own DB tables via Drizzle — keeping auth schema in the same migration pipeline as the rest of the app. The trade-off is that it is a newer library with a smaller ecosystem than Auth.js.
