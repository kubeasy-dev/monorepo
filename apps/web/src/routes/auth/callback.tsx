import { createFileRoute, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { getSessionFn } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth/callback")({
  beforeLoad: async () => {
    // Ensure user is authenticated after OAuth callback
    const session = await getSessionFn();
    if (!session) {
      throw redirect({ to: "/login" });
    }
    // Redirect authenticated users to dashboard
    throw redirect({ to: "/dashboard" });
  },
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        <p className="text-lg font-bold text-foreground/70">
          Setting up your account...
        </p>
      </div>
    </div>
  );
}
