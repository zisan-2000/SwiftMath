import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, X } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role, SessionStatus, PracticeMode } from "@/lib/generated/prisma/enums";
import { getStudentSession } from "@/server/practice";
import { getPracticeResultMessaging } from "@/lib/practice-result-messaging";
import { AppShell } from "@/components/app-shell";
import { PracticeRunner } from "@/components/student/practice-runner";
import { LevelUpCelebration } from "@/components/student/level-up-celebration";
import { PracticeRetryPrompt } from "@/components/student/practice-retry-prompt";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { startSessionAction } from "../actions";

export const metadata: Metadata = {
  title: "Practice session",
};

export default async function PracticeSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const student = await requireRole(Role.STUDENT);

  const [session, institute, profile] = await Promise.all([
    getStudentSession(student.id, sessionId),
    prisma.institute.findUnique({
      where: { id: student.instituteId },
      select: { name: true, logoUrl: true },
    }),
    prisma.user.findUnique({
      where: { id: student.id },
      select: { currentLevel: { select: { name: true } } },
    }),
  ]);

  if (!session) {
    notFound();
  }

  const instituteName = institute?.name ?? "Institute";
  const instituteLogoUrl = institute?.logoUrl ?? null;

  // --- In progress: run the test (no correct answers sent to client) ---
  if (session.status === SessionStatus.IN_PROGRESS) {
    const isReview = session.mode === PracticeMode.REVIEW;
    const safeQuestions = session.questions.map((q) => ({
      id: q.id,
      index: q.index,
      prompt: q.prompt,
    }));

    return (
      <AppShell
        user={student}
        instituteName={instituteName}
        instituteLogoUrl={instituteLogoUrl}
        title={session.level.name}
        subtitle={
          isReview
            ? "Review mode — no timer, no level-up. Submit when you're ready."
            : "Answer as many as you can before time runs out."
        }
      >
        <PracticeRunner
          sessionId={session.id}
          timed={!isReview}
          expiresAt={session.expiresAt.toISOString()}
          questions={safeQuestions}
        />
      </AppShell>
    );
  }

  // --- Finished: show the result + per-question review ---
  const expired = session.status === SessionStatus.EXPIRED;
  const isReview = session.mode === PracticeMode.REVIEW;
  const resultCopy = getPracticeResultMessaging({
    passed: session.passed,
    expired,
    isReview,
    leveledUp: session.leveledUp,
    passAccuracy: session.level.passAccuracy,
    accuracy: session.accuracy,
    levelName: session.level.name,
  });

  return (
    <AppShell
      user={student}
      instituteName={instituteName}
      instituteLogoUrl={instituteLogoUrl}
      title="Results"
      subtitle={session.level.name}
    >
      {session.leveledUp && (
        <LevelUpCelebration nextLevelName={profile?.currentLevel?.name} />
      )}

      {resultCopy.showRetryPrompt && (
        <PracticeRetryPrompt
          headline={resultCopy.headline}
          body={resultCopy.body}
        />
      )}

      <Card className="mb-8">
        <CardContent className="p-6 text-center">
          <p className="text-5xl font-bold tracking-tight text-foreground">
            {session.accuracy}%
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {session.correctCount} of {session.totalQuestions} correct · pass at{" "}
            {session.level.passAccuracy}%
          </p>

          {!resultCopy.showRetryPrompt && (
            <>
              <p className="mt-4 text-base font-semibold text-foreground">
                {resultCopy.headline}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {resultCopy.body}
              </p>
            </>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {isReview && <Badge variant="secondary">Review</Badge>}
            {expired && <Badge variant="warning">Time expired</Badge>}
            <Badge variant={session.passed ? "success" : "muted"}>
              {session.passed ? "Passed" : "Not passed"}
            </Badge>
            {session.leveledUp && (
              <Badge variant="default">Leveled up</Badge>
            )}
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <form action={startSessionAction}>
              {isReview && (
                <input type="hidden" name="mode" value="review" />
              )}
              <Button type="submit" size={resultCopy.showRetryPrompt ? "lg" : "default"}>
                {resultCopy.primaryActionLabel}
              </Button>
            </form>
            <Button asChild variant="outline">
              <Link href="/student/practice">Back</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Per-question review */}
      <Card>
        <ol className="divide-y divide-border">
          {session.questions.map((q) => (
            <li
              key={q.id}
              className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0 break-words font-mono text-foreground">
                <span className="mr-3 text-sm text-muted-foreground">
                  {q.index + 1}.
                </span>
                {q.prompt} = {q.correctAnswer}
              </span>
              <span className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-muted-foreground">
                  your answer: {q.studentAnswer === null ? "—" : q.studentAnswer}
                </span>
                {q.isCorrect ? (
                  <>
                    <Check className="h-4 w-4 text-success" aria-hidden="true" />
                    <span className="sr-only">Correct</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-destructive" aria-hidden="true" />
                    <span className="sr-only">Incorrect</span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ol>
      </Card>
    </AppShell>
  );
}
