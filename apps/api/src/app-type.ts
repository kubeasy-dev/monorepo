// Type-only re-export for cross-app RPC client typing.
// Consumers (apps/web) import this so they get end-to-end type safety
// without pulling the full server bundle into their TypeScript program.
export type { AppType } from "./app";
