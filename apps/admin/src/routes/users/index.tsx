import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/users/")({
  component: UsersPage,
});

function UsersPage() {
  return (
    <div className="py-8">
      <h1 className="text-xl font-bold">Users</h1>
      <p className="mt-2 text-base text-muted-foreground">
        User management is coming in Phase 11.
      </p>
    </div>
  );
}
