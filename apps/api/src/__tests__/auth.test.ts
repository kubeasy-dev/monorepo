import { describe, it } from "vitest";

describe("Better Auth Hono configuration", () => {
  it.todo("exports auth instance with betterAuth() configured (AUTH-01)");
  it.todo("includes apiKey() in plugins array (AUTH-01)");
  it.todo("includes admin() in plugins array (AUTH-01)");
  it.todo("declares resendContactId as additionalFields with input: false");
});

describe("User lifecycle BullMQ hook", () => {
  it.todo(
    "dispatches user-signup job to USER_LIFECYCLE queue on user.create (AUTH-01)",
  );
  it.todo("does not throw when BullMQ dispatch fails (fire-and-forget)");
  it.todo("job payload contains userId and email");
});
