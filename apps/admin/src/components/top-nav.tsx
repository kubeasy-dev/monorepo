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
    <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b-[3px] border-b-[oklch(0.15_0_0)] bg-card px-6">
      {/* Logo slot — left */}
      <Link to="/challenges" className="text-lg font-bold text-primary">
        Kubeasy
      </Link>

      {/* Nav links — center-right */}
      <nav className="flex items-center gap-1">
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        {/* Settings — disabled placeholder */}
        <span
          className="cursor-not-allowed rounded-md px-3 py-2 text-sm font-medium text-muted-foreground/50"
          aria-disabled="true"
        >
          Settings
        </span>
      </nav>

      {/* User slot — far right */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8 border-2 border-border">
              {user.image && <AvatarImage src={user.image} alt={user.name} />}
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
