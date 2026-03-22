import type { LogAttributes } from "@kubeasy/logger";

// Vite excludes this from the client bundle when import.meta.env.SSR is false.
// On the client, all calls are no-ops.
async function get() {
  if (!import.meta.env.SSR) return null;
  const { logger } = await import("@kubeasy/logger");
  return logger;
}

export const serverLog = {
  info: async (message: string, attrs?: LogAttributes) =>
    (await get())?.info(message, attrs),
  warn: async (message: string, attrs?: LogAttributes) =>
    (await get())?.warn(message, attrs),
  error: async (message: string, attrs?: LogAttributes) =>
    (await get())?.error(message, attrs),
};
