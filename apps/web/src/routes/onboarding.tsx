import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSessionFn } from "@/lib/auth.functions";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async ({ location }) => {
    const session = await getSessionFn();
    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    return { user: session.user };
  },
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user } = Route.useRouteContext();
  const firstName = user.name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black mb-4">
            Welcome, <span className="text-primary">{firstName}</span>!
          </h1>
          <p className="text-xl font-bold text-muted-foreground">
            Let&apos;s get you set up to start your Kubernetes journey.
          </p>
        </div>

        <div className="bg-secondary neo-border-thick neo-shadow p-8 space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-black">Getting Started</h2>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground font-black flex items-center justify-center neo-border">
                  1
                </span>
                <div>
                  <p className="font-bold">Install the Kubeasy CLI</p>
                  <div className="bg-black text-green-400 p-2 rounded neo-border font-mono text-sm mt-1">
                    brew install kubeasy-dev/tap/kubeasy
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground font-black flex items-center justify-center neo-border">
                  2
                </span>
                <div>
                  <p className="font-bold">Authenticate with your account</p>
                  <div className="bg-black text-green-400 p-2 rounded neo-border font-mono text-sm mt-1">
                    kubeasy auth login
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground font-black flex items-center justify-center neo-border">
                  3
                </span>
                <div>
                  <p className="font-bold">Start your first challenge</p>
                  <div className="bg-black text-green-400 p-2 rounded neo-border font-mono text-sm mt-1">
                    kubeasy challenge start pod-crash
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
