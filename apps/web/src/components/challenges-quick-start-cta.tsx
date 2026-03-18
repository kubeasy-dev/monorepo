import { Link } from "@tanstack/react-router";
import { ArrowRight, Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

/**
 * Quick start CTA shown only to unauthenticated users
 */
export function ChallengesQuickStartCTA() {
  const [mounted, setMounted] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render on server to avoid hydration mismatch
  if (!mounted) {
    return <div className="mb-8" />;
  }

  // Don't show while loading or if user is authenticated
  if (isPending || session) {
    return null;
  }

  return (
    <div className="mb-8 p-4 bg-secondary neo-border-thick neo-shadow flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Terminal className="h-5 w-5 text-primary" />
        <span className="font-bold">
          New to Kubeasy? Follow our setup guide to start your first challenge.
        </span>
      </div>
      <Link
        to="/get-started"
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 font-bold neo-border hover:translate-x-0.5 hover:translate-y-0.5 transition-transform whitespace-nowrap"
      >
        Try Free Demo
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
