import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, Layers } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Student",
};

/**
 * STUDENT dashboard. Shows current group and level with shortcuts to practice
 * and ranking.
 */
export default async function StudentDashboardPage() {
  const user = await requireRole(Role.STUDENT);

  // role/instituteId come from the session; group + level need a lookup.
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      institute: { select: { name: true, logoUrl: true } },
      group: { select: { name: true } },
      currentLevel: { select: { name: true } },
    },
  });

  return (
    <AppShell
      user={user}
      instituteName={profile?.institute.name ?? "Institute"}
      instituteLogoUrl={profile?.institute.logoUrl}
      title={`Hello, ${user.name}`}
      subtitle="Your practice home."
    >
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Current level"
          value={profile?.currentLevel?.name ?? "Not assigned"}
          hint="Set by your teacher"
          icon={Layers}
        />
        <StatCard label="Group" value={profile?.group?.name ?? "—"} icon={Boxes} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/student/practice">Go to practice</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/student/ranking">View ranking</Link>
        </Button>
      </div>
    </AppShell>
  );
}
