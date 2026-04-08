/// <reference types="vite/client" />
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { PostHogProvider, usePostHog } from "posthog-js/react";
import { type ReactNode, useEffect } from "react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { identifyUser } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import globalsCss from "@/styles/globals.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <title>404 — Page Not Found | Kubeasy</title>
      <div className="neo-border-thick neo-shadow bg-secondary p-10 max-w-md w-full">
        <p className="text-6xl font-black text-primary mb-4">404</p>
        <h1 className="text-2xl font-black mb-3">Page Not Found</h1>
        <p className="text-muted-foreground font-medium mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 font-bold neo-border hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  notFoundComponent: NotFoundPage,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Kubeasy - Learn Kubernetes by Doing" },
    ],
    links: [
      { rel: "stylesheet", href: globalsCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
    ],
  }),
  component: RootComponent,
});

function PostHogIdentify() {
  const { data: session } = authClient.useSession();

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  const userName = session?.user?.name;

  useEffect(() => {
    if (userId) {
      identifyUser(userId, {
        email: userEmail ?? undefined,
        name: userName ?? undefined,
      });
    }
  }, [userId, userEmail, userName]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const isLogin = useRouterState({
    select: (s) => s.location.pathname === "/login",
  });
  const posthog = usePostHog();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname triggers pageview on route change
  useEffect(() => {
    posthog?.capture("$pageview", { $current_url: window.location.href });
  }, [pathname]);

  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <PostHogIdentify />
        {!isLogin && <Header />}
        <main className={isLogin ? undefined : "pt-32 pb-20"}>
          <Outlet />
        </main>
        {!isLogin && <Footer />}
      </QueryClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {import.meta.env.VITE_POSTHOG_KEY ? (
          <PostHogProvider
            apiKey={import.meta.env.VITE_POSTHOG_KEY}
            options={{
              api_host:
                import.meta.env.VITE_POSTHOG_HOST ?? "https://eu.i.posthog.com",
              ...(import.meta.env.VITE_POSTHOG_UI_HOST && {
                ui_host: import.meta.env.VITE_POSTHOG_UI_HOST,
              }),
              capture_pageview: false,
              capture_pageleave: true,
              loaded: (ph) => {
                if (import.meta.env.DEV) ph.debug();
              },
            }}
          >
            {children}
          </PostHogProvider>
        ) : (
          children
        )}
        <Scripts />
      </body>
    </html>
  );
}
