import fs from "node:fs";
import path from "node:path";
import { auth } from "../src/lib/auth";

async function main() {
  const randomId = Math.random().toString(36).substring(7);
  const email = `fresh-${randomId}@example.com`;
  const name = "Fresh E2E User";

  const ctx = await auth.$context;
  const testUtils = ctx.test;

  // 1. Create user
  const user = testUtils.createUser({
    email,
    name,
  });
  await testUtils.saveUser(user);
  console.log(`Created new fresh test user: ${email}`);

  // 3. Generate cookies
  const cookies = await testUtils.getCookies({
    userId: user.id,
    domain: "localhost",
  });

  const outputPath = path.join(
    process.cwd(),
    "../../apps/web/e2e/.auth/fresh-user.json",
  );
  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify({ cookies }, null, 2));
  console.log(`Cookies saved to ${outputPath}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
