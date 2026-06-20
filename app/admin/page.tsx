import type { Metadata } from "next";
import Link from "next/link";
import {
  Boxes,
  GraduationCap,
  Layers,
  Users,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: `Admin · ${APP_NAME}`,
};

/**
 * Management areas reachable from the dashboard. Each is scoped to the admin's
 * own institute.
 */
const ADMIN_LINKS: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/admin/teachers",
    label: "Teachers",
    description: "Create teacher accounts and view your teaching staff.",
    icon: Users,
  },
  {
    href: "/admin/levels",
    label: "Levels",
    description: "Define the practice curriculum and difficulty.",
    icon: Layers,
  },
  {
    href: "/admin/students",
    label: "Students",
    description: "See every student across your institute.",
    icon: GraduationCap,
  },
  {
    href: "/admin/groups",
    label: "Groups",
    description: "See every class and which teacher runs it.",
    icon: Boxes,
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
        <StatCard label="Teachers" value={teachers} icon={Users} />
        <StatCard label="Students" value={students} icon={GraduationCap} />
        <StatCard label="Groups" value={groups} icon={Boxes} />
        <StatCard label="Levels" value={levels} icon={Layers} />
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Manage
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ADMIN_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className="group">
              <Card className="flex h-full items-center gap-4 p-5 transition-colors hover:border-primary/40 hover:bg-accent/40">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">
                    {link.label}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {link.description}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Card>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
