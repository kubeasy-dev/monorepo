import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { adminUsersOptions, adminUsersStatsOptions } from "@/lib/query-options";
import { UsersStats } from "@/components/users-stats";
import { UsersTable } from "@/components/users-table";
import { authClient } from "@/lib/auth-client";
import { Button } from "@kubeasy/ui/button";

export const Route = createFileRoute("/users/")({
  component: UsersPageWrapper,
});

function UsersPageWrapper() {
  return (
    <React.Suspense
      fallback={
        <div className="py-8 text-sm text-muted-foreground">Loading...</div>
      }
    >
      <UsersPage />
    </React.Suspense>
  );
}

function UsersPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: session } = authClient.useSession();
  const { data } = useSuspenseQuery(adminUsersOptions(page));
  const { data: stats } = useSuspenseQuery(adminUsersStatsOptions());

  const totalPages = Math.ceil(data.total / data.limit);
  const currentUserId = session?.user.id ?? "";

  return (
    <div className="py-8">
      <h1 className="text-2xl font-black mb-8">Users</h1>

      <UsersStats stats={stats} />

      <UsersTable
        users={data.users}
        currentUserId={currentUserId}
        onMutationSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        }}
      />

      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages || 1}
        </span>
        <Button
          variant="outline"
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
