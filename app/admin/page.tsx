import type { Metadata } from "next";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";

export const metadata: Metadata = {
  title: `Admin · ${APP_NAME}`,
};

/**
 * ADMIN dashboard (skeleton). Everything is scoped to the admin's own
 * institute. Management screens (teachers, students, levels) arrive in later
 * tasks; for now we surface the headline counts.
 */
export default async function AdminDashboardPage() {
  const user = await requireRole(Role.ADMIN);
  const { instituteId } = user;

  const [institute, teachers, students, groups, levels] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: instituteId },
      select: { name: true },
    }),
    prisma.user.count({ where: { instituteId, role: Role.TEACHER } }),
    prisma.user.count({ where: { instituteId, role: Role.STUDENT } }),
    prisma.group.count({ where: { instituteId } }),
    prisma.level.count({ where: { instituteId } }),
  ]);

  return (
    <AppShell
      user={user}
      instituteName={institute?.name ?? "Institute"}
      title="Admin dashboard"
      subtitle="Overview of your institute."
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Teachers" value={teachers} />
        <StatCard label="Students" value={students} />
        <StatCard label="Groups" value={groups} />
        <StatCard label="Levels" value={levels} />
      </div>

      <p className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
        Managing teachers, students, and levels is coming in upcoming tasks.
      </p>
    </AppShell>
  );
}
