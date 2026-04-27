import fs from "node:fs";
import path from "node:path";
import { auth } from "../src/lib/auth";

async function main() {
  const args = process.argv.slice(2);
  const customEmail = args[0];
  const customOutputPath = args[1];

  const randomId = Math.random().toString(36).substring(7);
  const email = customEmail || `fresh-${randomId}@example.com`;
  const name = "Fresh E2E User";

  const ctx = await auth.$context;
  const testUtils = ctx.test;

  // 1. Create user
  const user = await testUtils.createUser({
    email,
    name,
  });
  await testUtils.saveUser(user);
  console.log(`Created fresh test user: ${email}`);

  // 2. Generate cookies
  const cookies = await testUtils.getCookies({
    userId: user.id,
    domain: "localhost",
  });

  const finalOutputPath = customOutputPath
    ? path.isAbsolute(customOutputPath)
      ? customOutputPath
      : path.join(process.cwd(), customOutputPath)
    : path.join(process.cwd(), "../../apps/web/e2e/.auth/fresh-user.json");

  if (!fs.existsSync(path.dirname(finalOutputPath))) {
    fs.mkdirSync(path.dirname(finalOutputPath), { recursive: true });
  }

  fs.writeFileSync(finalOutputPath, JSON.stringify({ cookies }, null, 2));
  console.log(`Cookies saved to ${finalOutputPath}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
