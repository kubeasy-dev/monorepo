import type { AdminUserStatsOutput } from "@kubeasy/api-schemas/auth";
import { Users, UserCheck, UserX, Shield } from "lucide-react";

interface UsersStatsProps {
  stats: AdminUserStatsOutput;
}

export function UsersStats({ stats }: UsersStatsProps) {
  const cards = [
    {
      label: "Total Users",
      value: stats.total.toLocaleString(),
      icon: Users,
      subtext: "registered accounts",
    },
    {
      label: "Active",
      value: stats.active.toLocaleString(),
      icon: UserCheck,
      subtext: "not banned",
    },
    {
      label: "Banned",
      value: stats.banned.toLocaleString(),
      icon: UserX,
      subtext: "currently banned",
    },
    {
      label: "Admins",
      value: stats.admins.toLocaleString(),
      icon: Shield,
      subtext: "with admin role",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      {cards.map(({ label, value, icon: Icon, subtext }) => (
        <div key={label} className="bg-secondary neo-border-thick neo-shadow p-6">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-primary neo-border-thick neo-shadow rounded-lg">
              <Icon className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{label}</p>
              <p className="text-3xl font-black text-foreground">{value}</p>
            </div>
          </div>
          <p className="text-sm font-bold text-foreground">{subtext}</p>
        </div>
      ))}
    </div>
  );
}
