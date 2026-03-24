import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@kubeasy/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@kubeasy/ui/card";
import { signInWithSocialProvider } from "@/lib/auth-client";

type SocialProvider = "github" | "google" | "microsoft";

interface SocialProviderConfig {
  name: string;
  bgColor: string;
  textColor: string;
  icon: React.ReactNode;
}

const SOCIAL_PROVIDERS: Record<SocialProvider, SocialProviderConfig> = {
  github: {
    name: "GitHub",
    bgColor: "bg-black",
    textColor: "text-white",
    icon: (
      <svg
        className="h-6 w-6"
        fill="currentColor"
        viewBox="0 0 24 24"
        role="img"
        aria-label="GitHub icon"
      >
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  google: {
    name: "Google",
    bgColor: "bg-white",
    textColor: "text-black",
    icon: (
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        role="img"
        aria-label="Google icon"
      >
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
  },
  microsoft: {
    name: "Microsoft",
    bgColor: "bg-[#00A4EF]",
    textColor: "text-white",
    icon: (
      <svg
        className="h-6 w-6"
        viewBox="0 0 23 23"
        fill="currentColor"
        role="img"
        aria-label="Microsoft icon"
      >
        <path d="M0 0h11v11H0z" />
        <path d="M12 0h11v11H12z" />
        <path d="M0 12h11v11H0z" />
        <path d="M12 12h11v11H12z" />
      </svg>
    ),
  },
};

interface SocialButtonProps {
  provider: SocialProvider;
  isLoading: boolean;
  onClick: () => void;
  disabled: boolean;
}

function SocialButton({
  provider,
  isLoading,
  onClick,
  disabled,
}: SocialButtonProps) {
  const config = SOCIAL_PROVIDERS[provider];

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-14 text-lg font-bold neo-border-thick neo-shadow hover:neo-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${config.bgColor} ${config.textColor}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <span className="mr-3">{config.icon}</span>
          Continue with {config.name}
        </>
      )}
    </Button>
  );
}

type AuthStatus = "idle" | "loading" | "success" | "error";

interface AuthResult {
  status: AuthStatus;
  message?: string;
  provider?: SocialProvider;
}

interface LoginCardProps {
  callbackUrl?: string;
}

export function LoginCard({ callbackUrl = "/dashboard" }: LoginCardProps) {
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(
    null,
  );
  const [authResult, setAuthResult] = useState<AuthResult>({ status: "idle" });

  const handleSocialLogin = async (provider: SocialProvider) => {
    if (loadingProvider) return;

    try {
      setLoadingProvider(provider);
      setAuthResult({ status: "loading", provider });

      const data = await signInWithSocialProvider(provider, callbackUrl);

      if (data?.error) {
        setAuthResult({
          status: "error",
          message:
            data.error.message || "Authentication failed. Please try again.",
          provider,
        });
      } else {
        setAuthResult({
          status: "success",
          message: "Successfully authenticated! Redirecting...",
          provider,
        });
      }
    } catch (error) {
      setAuthResult({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        provider,
      });
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <Card className="neo-border-thick neo-shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-black">Sign In</CardTitle>
        <CardDescription className="text-base">
          Choose your preferred login method
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status Alert */}
        {authResult.status === "error" && authResult.message && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive bg-destructive/10 text-destructive neo-border-thick">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold">{authResult.message}</span>
          </div>
        )}

        {authResult.status === "success" && authResult.message && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-green-500 bg-green-50 text-green-800 neo-border-thick">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            <span className="text-sm font-semibold">{authResult.message}</span>
          </div>
        )}

        {/* Social Login Buttons */}
        <SocialButton
          provider="github"
          isLoading={loadingProvider === "github"}
          onClick={() => handleSocialLogin("github")}
          disabled={loadingProvider !== null}
        />

        <SocialButton
          provider="google"
          isLoading={loadingProvider === "google"}
          onClick={() => handleSocialLogin("google")}
          disabled={loadingProvider !== null}
        />

        <SocialButton
          provider="microsoft"
          isLoading={loadingProvider === "microsoft"}
          onClick={() => handleSocialLogin("microsoft")}
          disabled={loadingProvider !== null}
        />
      </CardContent>
    </Card>
  );
}
