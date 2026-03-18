import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// We will import api after mocking fetch
let api: typeof import("../lib/api-client").api;
let apiFetch: typeof import("../lib/api-client").apiFetch;

const mockFetch = vi.fn();

beforeEach(async () => {
  vi.stubGlobal("fetch", mockFetch);
  // Re-import to pick up stub
  const mod = await import("../lib/api-client");
  api = mod.api;
  apiFetch = mod.apiFetch;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  mockFetch.mockReset();
});

function makeMockResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("apiFetch", () => {
  it('sets credentials to "include" on every request', async () => {
    mockFetch.mockResolvedValue(makeMockResponse({ ok: true }));

    await apiFetch("/health");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe("include");
  });

  it("prepends API_BASE + /api to the path", async () => {
    mockFetch.mockResolvedValue(makeMockResponse({ ok: true }));

    await apiFetch("/health");

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/health$/);
  });

  it("throws on non-ok response with status code in message", async () => {
    mockFetch.mockResolvedValue(makeMockResponse(null, false, 404));

    await expect(apiFetch("/not-found")).rejects.toThrow("404");
  });

  it("sets Content-Type: application/json for POST requests", async () => {
    mockFetch.mockResolvedValue(makeMockResponse({ ok: true }));

    await apiFetch("/progress/something/start", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });
});

describe("api.challenges", () => {
  it("list() calls GET /api/challenges", async () => {
    mockFetch.mockResolvedValue(makeMockResponse({ challenges: [], count: 0 }));

    await api.challenges.list();

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/challenges$/);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe("include");
  });

  it("list() passes URLSearchParams for filters", async () => {
    mockFetch.mockResolvedValue(makeMockResponse({ challenges: [], count: 0 }));

    await api.challenges.list({ difficulty: "easy", theme: "networking" });

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("difficulty=easy");
    expect(url).toContain("theme=networking");
  });

  it('getBySlug("test") calls GET /api/challenges/test', async () => {
    mockFetch.mockResolvedValue(makeMockResponse({ challenge: null }));

    await api.challenges.getBySlug("test");

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/challenges\/test$/);
  });
});

describe("api.progress", () => {
  it('status("my-challenge") calls GET /api/progress/my-challenge', async () => {
    mockFetch.mockResolvedValue(makeMockResponse({ status: "not_started" }));

    await api.progress.status("my-challenge");

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/progress\/my-challenge$/);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe("include");
  });
});

describe("api.user", () => {
  it("xp() calls GET /api/user/xp", async () => {
    mockFetch.mockResolvedValue(
      makeMockResponse({
        xpEarned: 100,
        rank: "Beginner",
        rankInfo: { name: "Beginner", progress: 50, nextRankXp: 200 },
      }),
    );

    await api.user.xp();

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/user\/xp$/);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe("include");
  });
});
