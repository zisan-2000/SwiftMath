import type { Metadata } from "next";
import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";

export const metadata: Metadata = {
  title: `Student · ${APP_NAME}`,
};

/**
 * STUDENT dashboard (skeleton). Shows where the student currently sits (group +
 * level). Timed practice and ranking arrive in later tasks.
 */
export default async function StudentDashboardPage() {
  const user = await requireRole(Role.STUDENT);

  // role/instituteId come from the session; group + level need a lookup.
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      institute: { select: { name: true } },
      group: { select: { name: true } },
      currentLevel: { select: { name: true } },
    },
  });

  return (
    <AppShell
      user={user}
      instituteName={profile?.institute.name ?? "Institute"}
      title={`Hello, ${user.name}`}
      subtitle="Your practice home."
    >
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Current level"
          value={profile?.currentLevel?.name ?? "Not assigned"}
          hint="Set by your teacher"
        />
        <StatCard
          label="Group"
          value={profile?.group?.name ?? "—"}
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/student/practice"
          className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Go to practice
        </Link>
        <Link
          href="/student/ranking"
          className="inline-block rounded-lg border border-zinc-300 px-5 py-2.5 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          View ranking
        </Link>
      </div>
    </AppShell>
  );
}
