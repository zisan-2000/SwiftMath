import type { Metadata } from "next";

import { OperationType } from "@/lib/generated/prisma/enums";
import { listLevels } from "@/server/admin";
import { loadAdminPageContext } from "@/server/admin-page";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
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
  const { admin, institute } = await loadAdminPageContext();

  const levels = await listLevels(admin.instituteId);

  // Suggest the next free order position.
  const nextOrder =
    levels.reduce((max, l) => Math.max(max, l.orderIndex), 0) + 1;

  return (
    <AdminPageShell
      user={admin}
      institute={institute}
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
    </AdminPageShell>
  );
}
