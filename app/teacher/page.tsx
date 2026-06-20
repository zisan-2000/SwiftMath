import type { Metadata } from "next";
import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";

export const metadata: Metadata = {
  title: `Teacher · ${APP_NAME}`,
};

/**
 * TEACHER dashboard (skeleton). Scoped to the groups this teacher owns.
 * Creating groups, adding students, and assigning levels arrive in a later
 * task.
 */
export default async function TeacherDashboardPage() {
  const user = await requireRole(Role.TEACHER);

  const [institute, groupCount, studentCount] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: user.instituteId },
      select: { name: true },
    }),
    prisma.group.count({ where: { teacherId: user.id } }),
    // Students placed in any group this teacher owns.
    prisma.user.count({ where: { group: { teacherId: user.id } } }),
  ]);

  return (
    <AppShell
      user={user}
      instituteName={institute?.name ?? "Institute"}
      title="Teacher dashboard"
      subtitle="Your groups and students."
    >
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="My groups" value={groupCount} />
        <StatCard label="My students" value={studentCount} />
      </div>

      <div className="mt-8">
        <Link
          href="/teacher/groups"
          className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Manage groups
        </Link>
      </div>
    </AppShell>
  );
}
