import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Outlet,
} from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { TopNav } from "@/components/top-nav";
import { authClient } from "@/lib/auth-client";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  const { data: session, isPending } = authClient.useSession();
  const webUrl = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      window.location.href = `${webUrl}/login`;
    } else if (session.user.role !== "admin") {
      window.location.href = webUrl;
    }
  }, [session, isPending, webUrl]);

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center gap-3 bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!session || session.user.role !== "admin") {
    return null;
  }

  return (
    <>
      <TopNav user={session.user} />
      <main className="mx-auto max-w-screen-xl px-8 pt-16">
        <Outlet />
      </main>
    </>
  );
}
