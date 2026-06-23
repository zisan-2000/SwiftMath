import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
  Building2,
  GraduationCap,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  ArrowRight,
} from "lucide-react";

import { requireSuperAdmin } from "@/lib/session";
import { getPlatformStats } from "@/server/super";
import { getPlatformPracticeAnalytics } from "@/server/analytics";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { PracticeActivityChart } from "@/components/practice-activity-chart";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Super Admin",
};

/**
 * SUPER_ADMIN dashboard. Platform-level overview spanning every institute
 * (deliberately not scoped by `instituteId`). Auth is enforced by
 * `requireSuperAdmin`; the data layer (`server/super.ts`) is cross-tenant.
 */
export default async function SuperAdminDashboardPage() {
  const user = await requireSuperAdmin();
  const [stats, practice] = await Promise.all([
    getPlatformStats(),
    getPlatformPracticeAnalytics(),
  ]);

  return (
    <AppShell
      user={user}
      instituteName="Platform"
      title="Super Admin"
      subtitle="Platform-wide overview across all institutes."
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Institutes" value={stats.institutes} icon={Building2} />
        <StatCard label="Admins" value={stats.admins} icon={ShieldCheck} />
        <StatCard label="Teachers" value={stats.teachers} icon={Users} />
        <StatCard label="Students" value={stats.students} icon={GraduationCap} />
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Practice (last 7 days)
      </h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Sessions" value={practice.totalSessions} icon={Brain} />
        <StatCard
          label="Pass rate"
          value={`${practice.passRate}%`}
          icon={Target}
        />
        <StatCard
          label="Avg accuracy"
          value={`${practice.avgAccuracy}%`}
          icon={TrendingUp}
        />
      </div>

      <PracticeActivityChart
        data={practice.daily}
        empty={practice.totalSessions === 0}
        description="Platform-wide finished attempts over the last 7 days"
      />

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Manage
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/super/institutes" className="group">
          <Card className="flex h-full items-center gap-4 p-5 transition-colors hover:border-primary/40 hover:bg-accent/40">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-foreground">
                Institutes
              </span>
              <span className="block text-sm text-muted-foreground">
                View every institute on the platform and its user counts.
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Card>
        </Link>
      </div>
    </AppShell>
  );
}
