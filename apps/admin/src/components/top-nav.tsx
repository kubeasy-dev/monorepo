import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@kubeasy/ui/avatar";
import { Button } from "@kubeasy/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kubeasy/ui/dropdown-menu";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface TopNavProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
}

const navLinks = [
  { to: "/challenges", label: "Challenges" },
  { to: "/users", label: "Users" },
] as const;

export function TopNav({ user }: TopNavProps) {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background neo-shadow-sm neo-border-thick !border-t-0 !border-l-0 !border-r-0">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        {/* Logo slot — left */}
        <Link to="/challenges" className="text-2xl font-black">
          Kubeasy Admin
        </Link>

        {/* Nav links — center-right */}
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`inline-flex h-9 items-center justify-center rounded-lg px-4 py-2 text-base font-bold transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "bg-background hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {/* Settings — disabled placeholder */}
          <span
            className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-lg px-4 py-2 text-base font-bold text-muted-foreground/50"
            aria-disabled="true"
          >
            Settings
          </span>
        </nav>

        {/* User slot — far right */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-xl neo-border p-0">
              <Avatar className="h-full w-full rounded-lg">
                {user.image && <AvatarImage src={user.image} alt={user.name} />}
                <AvatarFallback className="bg-primary text-primary-foreground font-black rounded-lg">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="neo-border neo-shadow">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive font-bold"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
