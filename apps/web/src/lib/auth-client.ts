import { apiKeyClient } from "@better-auth/api-key/client";
import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { resetAnalytics } from "@/lib/analytics";

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? `${window.location.origin}/api/auth`
      : (() => {
          const base =
            typeof process !== "undefined" && process.env.VITE_API_URL
              ? process.env.VITE_API_URL
              : (import.meta.env.VITE_API_URL ?? "http://api:3001");
          return base.endsWith("/api/auth") ? base : `${base}/api/auth`;
        })(),
  fetchOptions: {
    credentials: "include",
  },
  plugins: [apiKeyClient(), adminClient()],
});

export async function signInWithSocialProvider(
  provider: string,
  callbackUrl: string,
) {
  return authClient.signIn.social({ provider, callbackURL: callbackUrl });
}

export async function signOut() {
  await authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        resetAnalytics();
        window.location.href = "/";
      },
    },
  });
}
