/**
 * Server-side analytics and event tracking utilities
 *
 * CLI lifecycle events (cli_login, cli_setup) are written directly to PostgreSQL.
 */

import { log } from "evlog";
import { db } from "../db";
import { cliEvent } from "../db/schema";

/**
 * Track CLI login event (server-side) — stored in PostgreSQL
 * @param userId - The user ID
 * @param metadata - CLI metadata (version, os, arch)
 */
export async function trackCliLogin(
  userId: string,
  metadata: { cliVersion: string; os: string; arch: string },
) {
  try {
    await db.insert(cliEvent).values({
      userId,
      eventType: "cli_login",
      cliVersion: metadata.cliVersion,
      os: metadata.os,
      arch: metadata.arch,
    });
    log.debug({
      message: "cli_login event recorded",
      userId,
      cliVersion: metadata.cliVersion,
    });
  } catch (error) {
    log.error({
      message: "Failed to record cli_login event",
      error: String(error),
    });
  }
}

/**
 * Track CLI setup event (server-side) — stored in PostgreSQL
 * @param userId - The user ID
 * @param metadata - CLI metadata (version, os, arch)
 */
export async function trackCliSetup(
  userId: string,
  metadata: { cliVersion: string; os: string; arch: string },
) {
  try {
    await db.insert(cliEvent).values({
      userId,
      eventType: "cli_setup",
      cliVersion: metadata.cliVersion,
      os: metadata.os,
      arch: metadata.arch,
    });
    log.debug({
      message: "cli_setup event recorded",
      userId,
      cliVersion: metadata.cliVersion,
    });
  } catch (error) {
    log.error({
      message: "Failed to record cli_setup event",
      error: String(error),
    });
  }
}
