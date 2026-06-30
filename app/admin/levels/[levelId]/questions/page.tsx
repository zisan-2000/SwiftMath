import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role, QuestionStatus } from "@/lib/generated/prisma/enums";
import { getLevel } from "@/server/admin";
import { listLevelQuestions } from "@/server/question-bank";
import { getLevelQuestionAnalytics } from "@/server/question-analytics";
import { getActiveCurriculumVersion } from "@/server/curriculum-version";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { AddLevelQuestionForm } from "@/components/admin/add-level-question-form";
import { ImportLevelQuestionsForm } from "@/components/admin/import-level-questions-form";
import { LevelQuestionsList } from "@/components/admin/level-questions-list";
import { LevelBankCoverageBanner } from "@/components/admin/level-bank-coverage-banner";
import { ActiveCurriculumVersionBanner } from "@/components/admin/curriculum-version-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ levelId: string }>;
}): Promise<Metadata> {
  const { levelId } = await params;
  const admin = await requireRole(Role.ADMIN);
  const level = await getLevel(admin, levelId);
  return {
    title: level ? `${level.name} — Question bank` : "Question bank",
  };
}

export default async function LevelQuestionsPage({
  params,
}: {
  params: Promise<{ levelId: string }>;
}) {
  const { levelId } = await params;
  const admin = await requireRole(Role.ADMIN);

  const [institute, level, questions, activeVersion, questionAnalytics] =
    await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true, logoUrl: true },
    }),
    getLevel(admin, levelId),
    listLevelQuestions(admin, levelId),
    getActiveCurriculumVersion(admin.instituteId),
    getLevelQuestionAnalytics(admin, levelId),
  ]);

  if (!level || !activeVersion) {
    notFound();
  }

  const activeBankCount = questions.filter(
    (q) =>
      q.status === QuestionStatus.PUBLISHED &&
      q.isActive &&
      q.curriculumVersion?.versionNumber === activeVersion.versionNumber,
  ).length;
  const draftBankCount = questions.filter(
    (q) => q.status === QuestionStatus.DRAFT,
  ).length;

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title={`${level.name} — Question bank`}
      subtitle="Institute-owned fixed questions. Teachers can disable items per group."
    >
      <BackLink href={`/admin/levels/${level.id}`}>Back to level</BackLink>

      <ActiveCurriculumVersionBanner
        className="mt-6"
        active={{
          versionNumber: activeVersion.versionNumber,
          label: activeVersion.label,
          publishedAt: activeVersion.publishedAt,
          liveQuestionCount: activeVersion._count.levelQuestions,
        }}
      />

      <LevelBankCoverageBanner
        className="mt-4"
        sessionQuestionCount={level.questionCount}
        totalBankCount={questions.length}
        activeBankCount={activeBankCount}
        bankOnly={level.bankOnly}
      />

      {draftBankCount > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          {draftBankCount} draft question{draftBankCount === 1 ? "" : "s"} not
          used in sessions until published.
        </p>
      )}

      <Card className="mt-6">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">
            Bank questions ({questions.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Drag the handle or use the arrows to set list order (admin reference
            only — sessions still pick randomly). Graded attempts on bank questions
            show attempt counts and success rates below (review drills excluded).
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <LevelQuestionsList
            levelId={level.id}
            activeVersionNumber={activeVersion.versionNumber}
            questions={questions.map((q) => ({
              id: q.id,
              prompt: q.prompt,
              correctAnswer: q.correctAnswer,
              category: q.category,
              difficulty: q.difficulty,
              status: q.status,
              isActive: q.isActive,
              orderIndex: q.orderIndex,
              curriculumVersionNumber: q.curriculumVersion?.versionNumber ?? null,
              analytics: questionAnalytics.get(q.id),
            }))}
            reorderEnabled={!level.archivedAt}
          />
        </CardContent>
      </Card>

      {!level.archivedAt && (
        <>
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base">Import from CSV</CardTitle>
              <p className="text-sm text-muted-foreground">
                Bulk-add questions from a spreadsheet export.
              </p>
            </CardHeader>
            <CardContent>
              <ImportLevelQuestionsForm levelId={level.id} />
            </CardContent>
          </Card>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base">Add question</CardTitle>
            </CardHeader>
            <CardContent>
              <AddLevelQuestionForm levelId={level.id} />
            </CardContent>
          </Card>
        </>
      )}

      {level.archivedAt && (
        <p className="mt-6 text-sm text-muted-foreground">
          This level is archived — restore it to add bank questions.
        </p>
      )}

      <div className="mt-6">
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/levels/${level.id}`}>Level settings</Link>
        </Button>
      </div>
    </AppShell>
  );
}
