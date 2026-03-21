import { createFileRoute, Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { z } from "zod";
import { LoginCard } from "@/components/login-card";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  component: LoginPage,
});

function LoginPage() {
  const { redirect: redirectUrl } = Route.useSearch();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const callbackUrl = `${origin}${redirectUrl ?? "/dashboard"}`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Image src="/logo.png" alt="Kubeasy" width={40} height={40} />
            <span className="text-2xl font-black">Kubeasy</span>
          </Link>
          <h1 className="text-4xl font-black text-balance">Welcome back</h1>
          <p className="text-foreground/70 text-lg">
            Sign in to continue your Kubernetes journey
          </p>
        </div>

        <LoginCard callbackUrl={callbackUrl} />

        <p className="text-xs text-center text-foreground/60">
          By continuing, you agree to our{" "}
          <a href="/terms" className="text-primary font-bold">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-primary font-bold">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
