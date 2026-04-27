import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, ".auth/challenge-user.json");

test.describe("Challenge Flow", () => {
  // Unique user for challenge tests
  test.beforeAll(async () => {
    const apiDir = path.join(__dirname, "../../../apps/api");
    const email = `challenge-e2e-${Math.random().toString(36).substring(7)}@example.com`;
    execSync(
      `pnpm tsx --env-file=.env scripts/get-fresh-user-cookies.ts ${email} ${authFile}`,
      {
        cwd: apiDir,
        stdio: "inherit",
      },
    );
  });

  test.use({ storageState: authFile });

  test("classic user flow: view, submit and complete challenge", async ({
    page,
    request,
  }) => {
    const slug = "first-deployment";
    const sessionToken = JSON.parse(
      fs.readFileSync(authFile, "utf-8"),
    ).cookies.find((c) => c.name === "better-auth.session_token")?.value;

    // Skip onboarding
    await request.post("/api/onboarding/skip", {
      headers: { Cookie: `better-auth.session_token=${sessionToken}` },
    });

    // 0. Reset progress to ensure a clean state
    await request.post(`/api/progress/${slug}/reset`, {
      headers: { Cookie: `better-auth.session_token=${sessionToken}` },
    });

    // 1. Go to challenge page
    await page.goto(`/challenges/${slug}`);

    // Wait for auth and loading
    await expect(page.getByTestId("mission-score")).toBeVisible({
      timeout: 15000,
    });

    // Visual Regression Test
    const missionCard = page
      .locator("div")
      .filter({ hasText: /Your Mission/i })
      .first();
    await expect(missionCard).toHaveScreenshot("mission-card-initial.png", {
      mask: [page.getByTestId("mission-score")],
    });

    // Check initial score (0/3)
    const scoreElement = page.getByTestId("mission-score");
    await expect(scoreElement).toHaveText("0/3");

    // Give some time for SSE to establish connection
    await page.waitForTimeout(2000);

    // 2. Start the challenge (Now dynamic!)
    await request.post(`/api/progress/${slug}/start`, {
      headers: { Cookie: `better-auth.session_token=${sessionToken}` },
    });

    // Wait for UI to reflect "In Progress" state DYNAMICALLY
    const commandBlock = page.locator(".font-mono");
    await expect(commandBlock).toContainText(/submit/i, { timeout: 15000 });

    // 3. Simulate PARTIAL submission
    await request.post(`/api/challenges/${slug}/submit`, {
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
        "Content-Type": "application/json",
      },
      data: {
        results: [
          { objectiveKey: "pods-ready", passed: true, message: "OK" },
          { objectiveKey: "nginx-logs", passed: false, message: "FAIL" },
          {
            objectiveKey: "deployment-available",
            passed: false,
            message: "FAIL",
          },
        ],
      },
    });

    // Verify UI reflects partial success
    await expect(page.getByTestId("objective-pods-ready")).toHaveClass(
      /bg-green-50/,
    );
    await expect(scoreElement).toHaveText("1/3");

    // 4. Simulate COMPLETE submission
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

    // 5. Verify UI reaction (SSE Invalidation)
    await expect(page.getByTestId("success-message")).toBeVisible({
      timeout: 15000,
    });
    await expect(scoreElement).toHaveText("3/3");

    // 6. Verify history
    const historyButton = page.getByTestId("view-history-button");
    await expect(historyButton).toBeVisible({ timeout: 10000 });
    await historyButton.click();
    await expect(page.getByText("Passed")).toBeVisible();
  });
});
