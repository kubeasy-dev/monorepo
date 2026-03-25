import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import type { AdminUserItem } from "@kubeasy/api-schemas/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kubeasy/ui/table";
import { Badge } from "@kubeasy/ui/badge";
import { Button } from "@kubeasy/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kubeasy/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@kubeasy/ui/avatar";
import { authClient } from "../lib/auth-client";
import { BanDialog } from "./ban-dialog";

interface UsersTableProps {
  users: AdminUserItem[];
  currentUserId: string;
  onMutationSuccess: () => void;
}

export function UsersTable({
  users,
  currentUserId,
  onMutationSuccess,
}: UsersTableProps) {
  const queryClient = useQueryClient();
  const [banTarget, setBanTarget] = useState<AdminUserItem | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    onMutationSuccess();
  };

  const setRoleMutation = useMutation({
    mutationFn: ({
      userId,
      role,
    }: { userId: string; role: "admin" | "user" }) =>
      authClient.admin.setRole({ userId, role }),
    onSettled: invalidate,
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      authClient.admin.banUser({ userId, banReason: reason || undefined }),
    onSettled: invalidate,
  });

  const unbanMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      authClient.admin.unbanUser({ userId }),
    onSettled: invalidate,
  });

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead>XP</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            const initials = user.name.slice(0, 2).toUpperCase();

            return (
              <TableRow
                key={user.id}
                className={user.banned ? "opacity-60" : ""}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image ?? undefined} alt={user.name} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {user.role === "admin" ? (
                    <Badge>Admin</Badge>
                  ) : (
                    <Badge variant="outline">User</Badge>
                  )}
                </TableCell>
                <TableCell>{user.completedChallenges}</TableCell>
                <TableCell>{user.totalXp.toLocaleString()}</TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {user.banned ? (
                    <div>
                      <Badge variant="destructive">Banned</Badge>
                      {user.banReason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {user.banReason}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-green-600"
                    >
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isSelf}
                        aria-label="Open user actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {user.role !== "admin" ? (
                        <DropdownMenuItem
                          disabled={isSelf}
                          onSelect={() =>
                            setRoleMutation.mutate({
                              userId: user.id,
                              role: "admin",
                            })
                          }
                        >
                          Make Admin
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          disabled={isSelf}
                          onSelect={() =>
                            setRoleMutation.mutate({
                              userId: user.id,
                              role: "user",
                            })
                          }
                        >
                          Remove Admin
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {!user.banned ? (
                        <DropdownMenuItem
                          disabled={isSelf}
                          onSelect={() => setBanTarget(user)}
                          className="text-destructive focus:text-destructive"
                        >
                          Ban User
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          disabled={isSelf}
                          onSelect={() =>
                            unbanMutation.mutate({ userId: user.id })
                          }
                        >
                          Unban User
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <BanDialog
        open={!!banTarget}
        onOpenChange={(o) => {
          if (!o) setBanTarget(null);
        }}
        userId={banTarget?.id ?? ""}
        userName={banTarget?.name ?? ""}
        onConfirm={(reason) => {
          if (banTarget) {
            banMutation.mutate({ userId: banTarget.id, reason });
            setBanTarget(null);
          }
        }}
        loading={banMutation.isPending}
      />
    </>
  );
}
