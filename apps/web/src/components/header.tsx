import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { UserDropdown } from "@/components/user-dropdown";
import { authClient } from "@/lib/auth-client";
import { siteConfig } from "@/lib/constants";

interface RouteProps {
  href: string;
  label: string;
  external?: boolean;
}

const routeList: RouteProps[] = [
  { href: "/challenges", label: "Challenges" },
  { href: "/blog", label: "Blog" },
  { href: "/docs", label: "Documentation", external: true },
];

export function Header() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background neo-shadow-sm neo-border-thick !border-t-0 !border-l-0 !border-r-0">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10"
          />
          <span className="text-2xl font-black hidden sm:inline">
            {siteConfig.name}
          </span>
          <span className="text-xl font-black sm:hidden">
            {siteConfig.name}
          </span>
        </Link>

        {/* Navigation - visible on medium screens and up */}
        <nav className="hidden md:flex items-center gap-1">
          {routeList.map(({ href, label, external }) =>
            external ? (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-max items-center justify-center rounded-lg bg-background px-4 py-2 text-base font-bold transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
              >
                {label}
              </a>
            ) : (
              <Link
                key={href}
                to={href}
                className="inline-flex h-9 w-max items-center justify-center rounded-lg bg-background px-4 py-2 text-base font-bold transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
              >
                {label}
              </Link>
            ),
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <UserDropdown
                user={user}
                isAdmin={session?.user.role === "admin"}
              />
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center h-7 gap-1 rounded-lg px-2.5 text-sm font-bold hover:bg-muted hover:text-foreground"
                >
                  Sign In
                </Link>
                <a
                  href="/docs/user/getting-started"
                  className="inline-flex items-center justify-center h-7 gap-1 rounded-lg px-2.5 text-sm font-bold neo-border neo-shadow bg-primary text-primary-foreground"
                >
                  Get Started
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
