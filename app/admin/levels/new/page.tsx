import type { Metadata } from "next";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role, OperationType } from "@/lib/generated/prisma/enums";
import { listLevels } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { LevelForm } from "@/components/admin/level-form";
import { Card, CardContent } from "@/components/ui/card";
import { createLevelAction } from "../actions";

export const metadata: Metadata = {
  title: "New level",
};

/**
 * ADMIN → levels → new. A dedicated create page (mirrors the edit page) so the
 * levels list stays a clean read-only table. The create action redirects back
 * to the list on success.
 */
export default async function NewLevelPage() {
  const admin = await requireRole(Role.ADMIN);

  const [institute, levels] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true, logoUrl: true },
    }),
    listLevels(admin.instituteId),
  ]);

  // Suggest the next free order position.
  const nextOrder =
    levels.reduce((max, l) => Math.max(max, l.orderIndex), 0) + 1;

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title="New level"
      subtitle="Add a level to your institute's practice curriculum."
    >
      <BackLink href="/admin/levels">All levels</BackLink>

      <Card>
        <CardContent className="pt-6">
          <LevelForm
            action={createLevelAction}
            submitLabel="Create level"
            defaults={{
              name: "",
              operation: OperationType.ADDITION,
              orderIndex: nextOrder,
              termsPerQuestion: 2,
              minNumber: 1,
              maxNumber: 9,
              questionCount: 10,
              timeLimitSeconds: 120,
              passAccuracy: 70,
              requiresPreviousPass: true,
              bankOnly: false,
            }}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
