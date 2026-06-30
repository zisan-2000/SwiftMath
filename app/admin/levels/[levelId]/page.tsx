import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getLevel } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { LevelForm } from "@/components/admin/level-form";
import { ArchiveLevelSection } from "@/components/admin/archive-level-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateLevelAction } from "../actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ levelId: string }>;
}): Promise<Metadata> {
  const { levelId } = await params;
  const admin = await requireRole(Role.ADMIN);
  const level = await getLevel(admin, levelId);
  return {
    title: level
      ? level.archivedAt
        ? `${level.name} (archived)`
        : `Edit ${level.name}`
      : "Edit level",
  };
}

export default async function EditLevelPage({
  params,
}: {
  // Next.js 16: route params are async.
  params: Promise<{ levelId: string }>;
}) {
  const { levelId } = await params;
  const admin = await requireRole(Role.ADMIN);

  const [institute, level] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true, logoUrl: true },
    }),
    getLevel(admin, levelId),
  ]);

  if (!level) {
    notFound();
  }

  const isArchived = level.archivedAt != null;
  const action = updateLevelAction.bind(null, level.id);

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title={level.name}
      subtitle={
        isArchived
          ? "Archived — restore to edit or assign again."
          : "Changes apply to new practice sessions started after saving."
      }
    >
      <BackLink href="/admin/levels">All levels</BackLink>

      {isArchived && (
        <div className="mt-4">
          <Badge variant="muted">Archived</Badge>
        </div>
      )}

      {!isArchived && (
        <Card className="mt-6">
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
              }}
            />
          </CardContent>
        </Card>
      )}

      <Card className="mt-8">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" aria-hidden />
            Question bank
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Fixed prompts for this level. Teachers can disable specific items
            per group; empty bank uses dynamic generation.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <p className="text-sm text-muted-foreground">
            Manage institute-owned questions for {level.name}.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/levels/${level.id}/questions`}>
              Open question bank
            </Link>
          </Button>
        </CardContent>
      </Card>

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
    </AppShell>
  );
}
