import { describe, it } from "vitest";

describe("GET /api/admin/challenges", () => {
  it.todo("returns all challenges with metrics");
  it.todo("requires admin role");
  it.todo("returns 401 for unauthenticated");
});

describe("GET /api/admin/challenges/stats", () => {
  it.todo("returns global challenge stats");
  it.todo("requires admin role");
});

describe("PATCH /api/admin/challenges/:slug/available", () => {
  it.todo("updates available field");
  it.todo("requires admin role");
});

describe("GET /api/admin/users", () => {
  it.todo("returns paginated users with metrics");
  it.todo("respects page and limit params");
  it.todo("requires admin role");
});

describe("GET /api/admin/users/stats", () => {
  it.todo("returns total/active/banned/admins counts");
  it.todo("requires admin role");
});
