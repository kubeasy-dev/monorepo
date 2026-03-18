import { createFileRoute, redirect } from "@tanstack/react-router";
import { adminStatsOptions } from "@/lib/query-options";

export const Route = createFileRoute("/_protected/(admin)/")({
  beforeLoad: async ({ context }) => {
    // Check admin role (user is available from _protected layout context)
    const user = (context as { user?: { role?: string } }).user;
    if (!user || user.role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(adminStatsOptions());
  },
  component: AdminIndexPage,
});

function AdminIndexPage() {
  return (
    <div className="space-y-6">
      <div className="bg-secondary neo-border-thick neo-shadow p-8">
        <h1 className="text-3xl font-black mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground font-bold">
          Manage challenges and users.
        </p>
      </div>
    </div>
  );
}
