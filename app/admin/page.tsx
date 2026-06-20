import type { Metadata } from "next";
import Link from "next/link";

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
 * Management areas reachable from the dashboard. Each is scoped to the admin's
 * own institute. Only "Teachers" is live in this task; the rest are wired up in
 * follow-up tasks but listed here so the navigation is stable.
 */
const ADMIN_LINKS: {
  href: string;
  label: string;
  description: string;
  ready: boolean;
}[] = [
  {
    href: "/admin/teachers",
    label: "Teachers",
    description: "Create teacher accounts and view your teaching staff.",
    ready: true,
  },
  {
    href: "/admin/levels",
    label: "Levels",
    description: "Define the practice curriculum and difficulty.",
    ready: true,
  },
  {
    href: "/admin/students",
    label: "Students",
    description: "See every student across your institute.",
    ready: true,
  },
  {
    href: "/admin/groups",
    label: "Groups",
    description: "See every class and which teacher runs it.",
    ready: true,
  },
];

/**
 * ADMIN dashboard. Everything is scoped to the admin's own institute: headline
 * counts plus navigation into the management areas.
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

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Manage
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ADMIN_LINKS.map((link) =>
          link.ready ? (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {link.label}
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {link.description}
              </span>
            </Link>
          ) : (
            <div
              key={link.href}
              className="flex flex-col gap-1 rounded-2xl border border-dashed border-zinc-300 bg-white p-5 opacity-70 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <span className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                {link.label}
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  Soon
                </span>
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {link.description}
              </span>
            </div>
          ),
        )}
      </div>
    </AppShell>
  );
}
