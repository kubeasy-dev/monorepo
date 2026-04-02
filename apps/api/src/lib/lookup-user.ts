import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { user as userTable } from "../db/schema/auth";
import type { SessionUser } from "../middleware/session";
import { auth } from "./auth";

/**
 * Verifies a Bearer API key and returns the associated user, or null if
 * the key is invalid / the user no longer exists.
 */
export async function lookupUserByApiKey(
  key: string,
): Promise<SessionUser | null> {
  const result = await auth.api.verifyApiKey({ body: { key } });
  if (!result.valid || !result.key) return null;

  const [foundUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, result.key.referenceId))
    .limit(1);

  return foundUser ? (foundUser as SessionUser) : null;
}
