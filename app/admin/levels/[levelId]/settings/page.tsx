import type { Metadata } from "next";

import { loadAdminLevelPageContext } from "@/server/admin-page";
import { AdminLevelShell } from "@/components/admin/admin-level-shell";
import { LevelForm } from "@/components/admin/level-form";
import { ArchiveLevelSection } from "@/components/admin/archive-level-section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateLevelAction } from "../../actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ levelId: string }>;
}): Promise<Metadata> {
  const { levelId } = await params;
  const { level } = await loadAdminLevelPageContext(levelId);
  return {
    title: `${level.name} — Settings`,
  };
}

export default async function AdminLevelSettingsPage({
  params,
}: {
  params: Promise<{ levelId: string }>;
}) {
  const { levelId } = await params;
  const { admin, institute, level } = await loadAdminLevelPageContext(levelId);

  const isArchived = level.archivedAt != null;
  const action = updateLevelAction.bind(null, level.id);

  return (
    <AdminLevelShell
      user={admin}
      institute={institute}
      levelId={levelId}
      levelName={level.name}
      subtitle={
        isArchived
          ? "Archived — restore below to edit curriculum rules again."
          : "Changes apply to new practice sessions started after saving."
      }
    >
      {isArchived && (
        <Badge variant="muted" className="mb-4">
          Archived
        </Badge>
      )}

      {!isArchived && (
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-base">Level rules</CardTitle>
            <p className="text-sm text-muted-foreground">
              Operation, timer, pass bar, prerequisites, and bank-only mode.
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            <LevelForm
              action={action}
              submitLabel="Save changes"
              defaults={{
                name: level.name,
                operation: level.operation,
                orderIndex: level.orderIndex,
                termsPerQuestion: level.termsPerQuestion,
                minNumber: level.minNumber,
                maxNumber: level.maxNumber,
                questionCount: level.questionCount,
                timeLimitSeconds: level.timeLimitSeconds,
                passAccuracy: level.passAccuracy,
                requiresPreviousPass: level.requiresPreviousPass,
                bankOnly: level.bankOnly,
              }}
            />
          </CardContent>
        </Card>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">
            {isArchived ? "Restore level" : "Archive level"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ArchiveLevelSection
            levelId={level.id}
            levelName={level.name}
            studentCount={level._count.studentsOnLevel}
            isArchived={isArchived}
          />
        </CardContent>
      </Card>
    </AdminLevelShell>
  );
}
