import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load saved cookies
const authStatePath = path.join(__dirname, ".auth/user.json");

test.describe("Challenge Flow", () => {
  test.beforeEach(async ({ context }) => {
    if (fs.existsSync(authStatePath)) {
      const { cookies } = JSON.parse(fs.readFileSync(authStatePath, "utf-8"));
      await context.addCookies(cookies);
    }
  });

  test("classic user flow: view, submit and complete challenge", async ({
    page,
    request,
    context,
  }) => {
    const slug = "first-deployment";
    const authFile = JSON.parse(fs.readFileSync(authStatePath, "utf-8"));
    const sessionToken = authFile.cookies.find(
      (c) => c.name === "better-auth.session_token",
    )?.value;

    // 0. Reset progress to ensure a clean state (Idempotency)
    await request.post(`/api/progress/${slug}/reset`, {
      headers: { Cookie: `better-auth.session_token=${sessionToken}` },
    });

    // 1. Go to challenge page
    await page.goto(`/challenges/${slug}`);

    // Wait for auth and loading
    await expect(page.getByText("Sign In")).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Pods Running")).toBeVisible({
      timeout: 10000,
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

    // 3. Simulate PARTIAL submission (Failing)
    await request.post(`/api/challenges/${slug}/submit`, {
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
        "Content-Type": "application/json",
      },
      data: {
        results: [
          {
            objectiveKey: "pods-ready",
            passed: true,
            message: "Pods are good",
          },
          {
            objectiveKey: "nginx-logs",
            passed: false,
            message: "Logs not found yet",
          },
          {
            objectiveKey: "deployment-available",
            passed: false,
            message: "Waiting for stability",
          },
        ],
      },
    });

    // Verify UI reflects partial success
    await expect(page.getByTestId("objective-pods-ready")).toHaveClass(
      /bg-green-50/,
    );
    await expect(page.getByTestId("objective-nginx-logs")).toHaveClass(
      /bg-red-50/,
    );
    await expect(scoreElement).toHaveText("1/3");
    await expect(page.getByTestId("success-message")).not.toBeVisible();

    // 4. Simulate COMPLETE submission (Success)
    await request.post(`/api/challenges/${slug}/submit`, {
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
        "Content-Type": "application/json",
      },
      data: {
        results: [
          {
            objectiveKey: "pods-ready",
            passed: true,
            message: "All pods are running",
          },
          {
            objectiveKey: "nginx-logs",
            passed: true,
            message: "Logs verified",
          },
          {
            objectiveKey: "deployment-available",
            passed: true,
            message: "Deployment is stable",
          },
        ],
      },
    });

    // 5. Verify UI reaction (SSE Invalidation)
    await expect(page.getByTestId("success-message")).toBeVisible({
      timeout: 15000,
    });
    await expect(scoreElement).toHaveText("3/3");

    // Verify specific objective visual state (green background) using test IDs
    await expect(page.getByTestId("objective-pods-ready")).toHaveClass(
      /bg-green-50/,
    );
    await expect(page.getByTestId("objective-nginx-logs")).toHaveClass(
      /bg-green-50/,
    );
    await expect(
      page.getByTestId("objective-deployment-available"),
    ).toHaveClass(/bg-green-50/);

    // 6. Verify history
    const historyButton = page.getByTestId("view-history-button");
    await expect(historyButton).toBeVisible({ timeout: 10000 });
    await historyButton.click();
    await expect(page.getByText("Passed")).toBeVisible();
    await page.keyboard.press("Escape"); // Close history dialog

    // 7. Verify Dashboard XP and Activity (Async via BullMQ)
    await page.goto("/dashboard");

    // XP and Activity can take a few seconds due to BullMQ worker processing
    // We wait for the XP to be greater than 0
    await expect(async () => {
      const xpText = await page.getByTestId("total-xp").innerText();
      expect(Number(xpText)).toBeGreaterThan(0);
    }).toPass({ timeout: 15000, intervals: [2000] });

    // Verify activity item for the challenge is present
    // Use .first() as there might be multiple activities (partial + complete)
    await expect(
      page.getByTestId(`activity-item-${slug}`).first(),
    ).toBeVisible();
  });
});
