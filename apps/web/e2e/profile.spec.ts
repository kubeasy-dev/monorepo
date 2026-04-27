import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, ".auth/profile-user.json");

// Run tests in this file sequentially because they share the same user state
test.describe.configure({ mode: "serial" });

test.describe("Profile Page", () => {
  // Unique user for this entire test file
  test.beforeAll(async () => {
    const apiDir = path.join(__dirname, "../../../apps/api");
    const email = `profile-e2e-${Math.random().toString(36).substring(7)}@example.com`;
    execSync(
      `pnpm tsx --env-file=.env scripts/get-fresh-user-cookies.ts ${email} ${authFile}`,
      {
        cwd: apiDir,
        stdio: "inherit",
      },
    );
  });

  test.use({ storageState: authFile });

  test("should update user name dynamically", async ({ page, request }) => {
    test.setTimeout(60000);
    const authFileRaw = JSON.parse(fs.readFileSync(authFile, "utf-8"));
    const sessionToken = authFileRaw.cookies.find(
      (c) => c.name === "better-auth.session_token",
    )?.value;

    // Skip onboarding
    await request.post("/api/onboarding/skip", {
      headers: { Cookie: `better-auth.session_token=${sessionToken}` },
    });

    await page.goto("/profile");
    await expect(page.getByText(/Loading/i)).not.toBeVisible({
      timeout: 15000,
    });

    const newFirstName = "John";
    const newLastName = "Doe";
    const expectedFullName = `${newFirstName} ${newLastName}`;

    await page.getByTestId("first-name-input").fill(newFirstName);
    await page.getByTestId("last-name-input").fill(newLastName);
    await page.getByRole("button", { name: /Save Changes/i }).click();

    // Verify dynamic update (header should change)
    await expect(page.getByTestId("profile-user-name")).toHaveText(
      expectedFullName,
      { timeout: 15000 },
    );

    // Verify persistence after reload
    await page.reload();
    await expect(page.getByTestId("first-name-input")).toHaveValue(
      newFirstName,
    );
  });

  test("should create, use and delete API tokens", async ({
    page,
    request,
  }) => {
    test.setTimeout(60000);
    const authFileRaw = JSON.parse(fs.readFileSync(authFile, "utf-8"));
    const sessionToken = authFileRaw.cookies.find(
      (c) => c.name === "better-auth.session_token",
    )?.value;

    await request.post("/api/onboarding/skip", {
      headers: { Cookie: `better-auth.session_token=${sessionToken}` },
    });

    await page.goto("/profile");
    await expect(page.getByText(/Loading/i)).not.toBeVisible({
      timeout: 15000,
    });

    const tokenName = `token-${Math.random().toString(36).substring(7)}`;

    // 1. Create Token
    await page.getByTestId("new-token-button").click();
    const input = page.getByTestId("new-token-name-input");
    await expect(input).toBeVisible();
    await input.fill(tokenName);
    await page.getByTestId("create-token-confirm-button").click();

    // 2. Capture and Verify Token Value
    const tokenValueElement = page.getByTestId("created-token-value");
    await expect(tokenValueElement).toBeVisible({ timeout: 10000 });
    const tokenValue = await tokenValueElement.innerText();
    expect(tokenValue.length).toBeGreaterThan(20);

    // 3. Test the token via direct API call
    const apiResponse = await request.get("/api/user/me", {
      headers: { Authorization: `Bearer ${tokenValue}` },
    });
    expect(
      apiResponse.ok(),
      `Token should be functional. Status: ${apiResponse.status()}`,
    ).toBeTruthy();

    // 4. Close the token alert and verify it's gone
    await page.getByTestId("token-saved-button").click();
    await expect(tokenValueElement).not.toBeVisible();

    // 5. Verify it appears in the list
    const tokenItem = page.getByTestId(`api-token-item-${tokenName}`);
    await expect(tokenItem).toBeVisible();

    // 6. Delete
    await tokenItem.getByRole("button").click();
    const confirmBtn = page.getByTestId("confirm-delete-token-button");
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Ensure the item is gone from UI
    await expect(tokenItem).not.toBeVisible({ timeout: 10000 });
  });

  test("should reset all user progress", async ({ page, request }) => {
    test.setTimeout(60000);
    const slug = "first-deployment";
    const authFileRaw = JSON.parse(fs.readFileSync(authFile, "utf-8"));
    const sessionToken = authFileRaw.cookies.find(
      (c) => c.name === "better-auth.session_token",
    )?.value;

    await request.post("/api/onboarding/skip", {
      headers: { Cookie: `better-auth.session_token=${sessionToken}` },
    });

    // 1. Setup: Progress
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

    // 2. Perform Reset
    await page.goto("/profile");
    await expect(page.getByText(/Loading/i)).not.toBeVisible({
      timeout: 15000,
    });

    await page.getByTestId("reset-progress-button").click();
    const confirmResetBtn = page.getByTestId("confirm-reset-progress-button");
    await expect(confirmResetBtn).toBeVisible();
    await confirmResetBtn.click();

    // Wait for modal to close
    await expect(confirmResetBtn).not.toBeVisible({ timeout: 10000 });

    // 3. Verify reset on dashboard
    await page.goto("/dashboard");
    await expect(page.getByTestId("total-xp")).toHaveText("0", {
      timeout: 15000,
    });
    await expect(page.getByText(/No activity yet/i)).toBeVisible();
  });
});
