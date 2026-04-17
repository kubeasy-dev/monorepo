import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { authClient } from "./auth-client";

export const getSessionFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const cookie = headers.get("Cookie");
    try {
      const session = await authClient.getSession({
        fetchOptions: {
          headers: { Cookie: cookie ?? "" },
        },
      });
      return session?.data ?? null;
    } catch {
      return null;
    }
  },
);
