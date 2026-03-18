import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/(admin)/users")({
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { role?: string } }).user;
    if (!user || user.role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
  component: AdminUsersPage,
});

function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div className="bg-secondary neo-border-thick neo-shadow">
        <div className="p-6 border-b-2 border-black">
          <h2 className="text-2xl font-black">Users</h2>
          <p className="text-muted-foreground font-bold">
            Manage user roles and access. Ban or unban users from the platform.
          </p>
        </div>
        <div className="p-6">
          <p className="text-muted-foreground font-bold">
            User management coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
