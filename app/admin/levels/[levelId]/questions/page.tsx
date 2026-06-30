import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getLevel } from "@/server/admin";
import { listLevelQuestions } from "@/server/question-bank";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { AddLevelQuestionForm } from "@/components/admin/add-level-question-form";
import { ImportLevelQuestionsForm } from "@/components/admin/import-level-questions-form";
import { LevelQuestionsList } from "@/components/admin/level-questions-list";
import { LevelBankCoverageBanner } from "@/components/admin/level-bank-coverage-banner";
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

  const [institute, level, questions] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true, logoUrl: true },
    }),
    getLevel(admin, levelId),
    listLevelQuestions(admin, levelId),
  ]);

  if (!level) {
    notFound();
  }

  const activeBankCount = questions.filter((q) => q.isActive).length;

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title={`${level.name} — Question bank`}
      subtitle="Institute-owned fixed questions. Teachers can disable items per group."
    >
      <BackLink href={`/admin/levels/${level.id}`}>Back to level</BackLink>

      <LevelBankCoverageBanner
        className="mt-6"
        sessionQuestionCount={level.questionCount}
        totalBankCount={questions.length}
        activeBankCount={activeBankCount}
        bankOnly={level.bankOnly}
      />

      <Card className="mt-6">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">
            Bank questions ({questions.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Sessions pick randomly from active bank entries for each student&apos;s
            group, then fill any remainder with dynamic questions from level rules.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <LevelQuestionsList levelId={level.id} questions={questions} />
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
