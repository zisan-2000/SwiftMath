import type { Metadata } from "next";
import Link from "next/link";
import {
  Clock,
  ListChecks,
  Lock,
  Play,
  RotateCcw,
  Search,
  Target,
  Zap,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { SessionStatus, PracticeMode } from "@/lib/generated/prisma/enums";
import {
  resolveChallengePassAccuracy,
  resolveChallengeTimeLimitSeconds,
} from "@/lib/challenge-mode";
import { shouldShowPracticeHomeRetryHint } from "@/lib/practice-result-messaging";
import { listRecentSessions } from "@/server/practice";
import { resolveStudentPracticeTimeLimit } from "@/server/teacher";
import { checkStudentLevelAccess } from "@/server/level-access";
import { loadStudentPageContext } from "@/server/student-page";
import { StudentPageShell } from "@/components/student/student-page-shell";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormMessage } from "@/components/ui/form-message";
import { startSessionAction } from "./actions";

export const metadata: Metadata = {
  title: "Practice",
};

function formatAttemptMode(mode: PracticeMode): string {
  switch (mode) {
    case PracticeMode.REVIEW:
      return "Review";
    case PracticeMode.CHALLENGE:
      return "Challenge";
    case PracticeMode.EXAM:
      return "Exam";
    default:
      return "Practice";
  }
}

export default async function PracticeHomePage({
  searchParams,
}: {
  searchParams: Promise<{ locked?: string; bank?: string }>;
}) {
  const { student, institute } = await loadStudentPageContext();
  const params = await searchParams;

  const [profile, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: student.id },
      select: {
        currentLevel: {
          select: {
            id: true,
            name: true,
            questionCount: true,
            timeLimitSeconds: true,
            passAccuracy: true,
          },
        },
      },
    }),
    listRecentSessions(student.id),
  ]);

  const level = profile?.currentLevel;
  const effectiveTimeLimitSeconds =
    level != null
      ? await resolveStudentPracticeTimeLimit(
          student.id,
          level.id,
          level.timeLimitSeconds,
        )
      : null;
  const hasTimeOverride =
    level != null && effectiveTimeLimitSeconds !== level.timeLimitSeconds;
  const challengeTimeLimitSeconds =
    effectiveTimeLimitSeconds != null
      ? resolveChallengeTimeLimitSeconds(effectiveTimeLimitSeconds)
      : null;
  const challengePassAccuracy =
    level != null ? resolveChallengePassAccuracy(level.passAccuracy) : null;
  const access = level
    ? await checkStudentLevelAccess(
        student.id,
        student.instituteId,
        level.id,
      )
    : null;
  const isLocked = access != null && !access.allowed;
  const lastSession = sessions[0];
  const showRetryHint = shouldShowPracticeHomeRetryHint({
    hasLevel: level != null,
    currentLevelId: level?.id,
    lastSession: lastSession
      ? {
          passed: lastSession.passed,
          mode: lastSession.mode,
          status: lastSession.status,
          levelId: lastSession.levelId,
        }
      : null,
  });

  const recentNonExamAttempts = sessions.filter(
    (session) => session.mode !== PracticeMode.EXAM,
  );
  const latestCompletedAttempt = recentNonExamAttempts.find(
    (session) => session.status !== SessionStatus.IN_PROGRESS,
  );

  return (
    <StudentPageShell
      user={student}
      institute={institute}
      title="Practice"
      subtitle="Timed practice at your current level."
    >
      {params.locked === "1" && isLocked && access?.message && (
        <FormMessage variant="error" className="mb-6">
          {access.message}
        </FormMessage>
      )}

      {params.bank === "1" && (
        <FormMessage variant="error" className="mb-6">
          This level requires fixed bank questions, but not enough are available
          for your group right now. Ask your teacher or institute admin.
        </FormMessage>
      )}

      {showRetryHint && level && (
        <Card className="mb-6 border-warning/40 bg-warning/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
                <RotateCcw className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold text-foreground">
                  Keep going on {level.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your last timed attempt did not pass. You stay on this level —
                  try again when you are ready.
                </p>
              </div>
            </div>
            <form action={startSessionAction} className="shrink-0">
              <Button type="submit" size="lg">
                Try again
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {level ? (
        <>
          <section className="mb-8 overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-br from-primary/10 via-primary/5 to-background p-6 sm:p-8">
            <div className="flex flex-col gap-6">
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary">
                  Current practice level
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {level.name}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Choose how you want to practice today. Standard mode helps you
                  level up; challenge is faster and stricter; review is untimed.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Questions"
                  value={level.questionCount}
                  icon={ListChecks}
                />
                <StatCard
                  label="Time limit"
                  value={`${effectiveTimeLimitSeconds ?? level.timeLimitSeconds}s`}
                  hint={
                    hasTimeOverride
                      ? `Group override from ${level.timeLimitSeconds}s`
                      : "Standard timer"
                  }
                  icon={Clock}
                />
                <StatCard
                  label="Pass target"
                  value={`${level.passAccuracy}%`}
                  hint="Needed to pass standard mode"
                  icon={Target}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {hasTimeOverride && (
                  <Badge variant="secondary">Custom group timer</Badge>
                )}
                {isLocked && (
                  <Badge variant="warning">
                    <Lock className="h-3.5 w-3.5" />
                    Locked
                  </Badge>
                )}
              </div>

              {isLocked && access?.message ? (
                <p className="text-sm text-muted-foreground">
                  {access.message} Ask your teacher if you think this is a
                  mistake.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <Card className="overflow-hidden border-primary/20">
                    <CardContent className="flex h-full flex-col p-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Play className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 font-semibold text-foreground">
                        Standard practice
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Timed session at your current level. Pass in time to keep
                        moving forward.
                      </p>
                      <form action={startSessionAction} className="mt-5">
                        <Button type="submit" className="w-full">
                          Start practice
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden">
                    <CardContent className="flex h-full flex-col p-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Zap className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 font-semibold text-foreground">
                        Challenge mode
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Shorter timer, stricter pass target, and no level-up —
                        best for testing speed.
                      </p>
                      {challengeTimeLimitSeconds != null &&
                        challengePassAccuracy != null && (
                          <p className="mt-3 text-xs text-muted-foreground">
                            {challengeTimeLimitSeconds}s timer · pass at{" "}
                            {challengePassAccuracy}%
                          </p>
                        )}
                      <form action={startSessionAction} className="mt-5">
                        <input type="hidden" name="mode" value="challenge" />
                        <Button type="submit" variant="secondary" className="w-full">
                          <Zap className="h-4 w-4" />
                          Start challenge
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden">
                    <CardContent className="flex h-full flex-col p-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Search className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 font-semibold text-foreground">
                        Review mode
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        No timer and no level-up. Use this when you want calm
                        repetition before the real attempt.
                      </p>
                      <form action={startSessionAction} className="mt-5">
                        <input type="hidden" name="mode" value="review" />
                        <Button type="submit" variant="outline" className="w-full">
                          Review without timer
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <EmptyState
          icon={Target}
          title="No level assigned yet"
          description="Your teacher hasn’t assigned a level yet. Check back soon."
          className="mb-8"
        />
      )}

      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent attempts
          </h2>
          <p className="text-sm text-muted-foreground">
            Your latest sessions, results, and retries.
          </p>
        </div>
        {latestCompletedAttempt && latestCompletedAttempt.mode === PracticeMode.STANDARD && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/student/practice/${latestCompletedAttempt.id}`}>
              View latest result
            </Link>
          </Button>
        )}
      </div>
      {sessions.length === 0 ? (
        <EmptyState
          title="No attempts yet"
          description="Start a practice session to build your history here."
        />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {s.level.name} · {formatAttemptMode(s.mode)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.createdAt.toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {s.mode === PracticeMode.REVIEW && (
                    <Badge variant="secondary">Review</Badge>
                  )}
                  {s.mode === PracticeMode.CHALLENGE && (
                    <Badge variant="secondary">Challenge</Badge>
                  )}
                  {s.mode === PracticeMode.EXAM && (
                    <Badge variant="secondary">Exam</Badge>
                  )}
                  {s.status === SessionStatus.IN_PROGRESS ? (
                    <>
                      <Badge variant="warning">In progress</Badge>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/student/practice/${s.id}`}>Resume</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold tabular-nums text-foreground">
                        {s.accuracy}%
                      </span>
                      <Badge variant={s.passed ? "success" : "muted"}>
                        {s.passed ? "Passed" : "Try again"}
                      </Badge>
                      {s.leveledUp && <Badge>Leveled up</Badge>}
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/student/practice/${s.id}`}>
                          {s.passed || s.mode !== PracticeMode.STANDARD
                            ? "View results"
                            : "Retry details"}
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </StudentPageShell>
  );
}
