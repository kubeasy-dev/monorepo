import { useNavigate } from "@tanstack/react-router";
import type { User } from "better-auth";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@kubeasy/ui/avatar";
import { Button } from "@kubeasy/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kubeasy/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";

export function UserDropdown({
  user,
  isAdmin,
}: {
  user: User;
  isAdmin?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-xl neo-border p-0"
        >
          <Avatar className="h-full w-full rounded-lg">
            <AvatarImage
              src={user.image ?? undefined}
              alt={user.name || "User"}
            />
            <AvatarFallback className="bg-primary text-primary-foreground font-black rounded-lg">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="neo-border neo-shadow">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-bold leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
            Profile
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem
              onClick={() => {
                window.location.href = "/admin/challenges";
              }}
            >
              Admin
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => signOut()}
            className="text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
