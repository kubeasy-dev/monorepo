import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authStatePath = path.join(__dirname, ".auth/fresh-user.json");

test.describe("Gamification System", () => {
  test.beforeEach(async ({ context }) => {
    if (fs.existsSync(authStatePath)) {
      const { cookies } = JSON.parse(fs.readFileSync(authStatePath, "utf-8"));
      // Map to Playwright expected format
      await context.addCookies(
        cookies.map((c) => ({
          name: c.name,
          value: c.value,
          url: "http://localhost:3024",
        })),
      );
    }
  });

  test("new user should gain first challenge bonus and start streak", async ({
    page,
    request,
    baseURL,
  }) => {
    const slug = "first-deployment";
    const authFile = JSON.parse(fs.readFileSync(authStatePath, "utf-8"));
    const sessionToken = authFile.cookies.find(
      (c) => c.name === "better-auth.session_token",
    )?.value;

    // 0. Hard Reset User Progress (XP, Challenges, Streaks)
    const resetRes = await request.delete("/api/user/progress", {
      headers: { Cookie: `better-auth.session_token=${sessionToken}` },
    });
    expect(resetRes.ok()).toBeTruthy();

    // 1. Initial State Check (Dashboard)
    await page.goto("/dashboard");

    // If redirected to onboarding, skip it
    if (page.url().includes("/onboarding")) {
      await request.post("/api/onboarding/skip", {
        headers: { Cookie: `better-auth.session_token=${sessionToken}` },
      });
      await page.goto("/dashboard");
    }

    const initialXp = await page.getByTestId("total-xp").innerText();
    expect(initialXp).toBe("0");

    const streakCard = page.getByText(/Day Streak/i).locator("xpath=..");
    const initialStreak = await streakCard.locator("p.text-3xl").innerText();
    expect(initialStreak).toBe("0");

    // 2. Starting challenge via API
    const startRes = await request.post(`/api/progress/${slug}/start`, {
      headers: { Cookie: `better-auth.session_token=${sessionToken}` },
    });
    expect(startRes.ok()).toBeTruthy();

    // 3. Submitting completion via API
    const submitRes = await request.post(`/api/challenges/${slug}/submit`, {
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
        "Content-Type": "application/json",
      },
      data: {
        results: [
          { objectiveKey: "pods-ready", passed: true, message: "OK" },
          { objectiveKey: "nginx-logs", passed: true, message: "OK" },
          { objectiveKey: "deployment-available", passed: true, message: "OK" },
        ],
      },
    });
    expect(submitRes.ok()).toBeTruthy();

    // 4. Verifying final state on dashboard
    if (!page.url().includes("/dashboard")) {
      await page.goto("/dashboard");
    }

    // Total XP should be 100 (50 base + 50 bonus)
    await expect(async () => {
      const xpText = await page.getByTestId("total-xp").innerText();
      expect(xpText).toBe("100");
    }).toPass({ timeout: 15000, intervals: [2000] });

    const finalStreak = await streakCard.locator("p.text-3xl").innerText();
    expect(finalStreak).toBe("1");

    // Checking activity list
    await expect(page.getByText("First challenge bonus")).toBeVisible();
  });
});
