import fs from "node:fs";
import path from "node:path";
import { auth } from "../src/lib/auth";

async function main() {
  const email = "test-e2e@example.com";
  const name = "Test E2E User";

  const ctx = await auth.$context;
  const testUtils = ctx.test;

  // 1. Clean up existing data for this email to avoid inconsistencies
  const existingUser = await ctx.internalAdapter.findUserByEmail(email);
  if (existingUser) {
    await testUtils.deleteUser(existingUser.id);
    console.log(`Deleted existing test user: ${email}`);
  }

  // 2. Create a fresh user
  const user = testUtils.createUser({
    email,
    name,
  });
  await testUtils.saveUser(user);
  console.log(`Created fresh test user: ${email}`);

  // 3. Generate cookies (this will create a valid session in DB/Redis)
  const cookies = await testUtils.getCookies({
    userId: user.id,
    domain: "localhost",
  });

  const outputPath = path.join(
    process.cwd(),
    "../../apps/web/e2e/.auth/user.json",
  );
  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  }

  // Playwright expect an object with cookies array or just the cookies array?
  // Actually addCookies takes an array of cookie objects.
  // Better Auth getCookies returns exactly that.

  fs.writeFileSync(outputPath, JSON.stringify({ cookies }, null, 2));
  console.log(`Cookies saved to ${outputPath}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
