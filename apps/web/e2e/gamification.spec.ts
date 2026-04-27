import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, ".auth/gamification-user.json");

test.describe("Gamification System", () => {
  // Unique user for gamification tests
  test.beforeAll(async () => {
    const apiDir = path.join(__dirname, "../../../apps/api");
    const email = `gamification-e2e-${Math.random().toString(36).substring(7)}@example.com`;
    execSync(
      `pnpm tsx --env-file=.env scripts/get-fresh-user-cookies.ts ${email} ${authFile}`,
      {
        cwd: apiDir,
        stdio: "inherit",
      },
    );
  });

  test.use({ storageState: authFile });

  test("new user should gain first challenge bonus and start streak", async ({
    page,
    request,
    baseURL,
  }) => {
    test.setTimeout(60000);
    const slug = "first-deployment";
    const sessionToken = JSON.parse(
      fs.readFileSync(authFile, "utf-8"),
    ).cookies.find((c) => c.name === "better-auth.session_token")?.value;

    // 0. Reset progress
    await request.delete("/api/user/progress", {
      headers: { Cookie: `better-auth.session_token=${sessionToken}` },
    });

    // 1. Initial State Check
    await page.goto("/dashboard");

    // Skip onboarding
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

    // 2. Complete Challenge
    await request.post(`/api/progress/${slug}/start`, {
      headers: { Cookie: `better-auth.session_token=${sessionToken}` },
    });
    await request.post(`/api/challenges/${slug}/submit`, {
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

    // 3. Verify final state
    if (!page.url().includes("/dashboard")) {
      await page.goto("/dashboard");
    }

    // Total XP should be 100
    await expect(async () => {
      const xpText = await page.getByTestId("total-xp").innerText();
      expect(xpText).toBe("100");
    }).toPass({ timeout: 15000, intervals: [2000] });

    const finalStreak = await streakCard.locator("p.text-3xl").innerText();
    expect(finalStreak).toBe("1");

    await expect(page.getByText("First challenge bonus")).toBeVisible();
  });
});
