import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ListChecks, Lock, RotateCcw, Target, Zap } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role, SessionStatus, PracticeMode } from "@/lib/generated/prisma/enums";
import {
  resolveChallengePassAccuracy,
  resolveChallengeTimeLimitSeconds,
} from "@/lib/challenge-mode";
import { shouldShowPracticeHomeRetryHint } from "@/lib/practice-result-messaging";
import { listRecentSessions } from "@/server/practice";
import { resolveStudentPracticeTimeLimit } from "@/server/teacher";
import { checkStudentLevelAccess } from "@/server/level-access";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormMessage } from "@/components/ui/form-message";
import { startSessionAction } from "./actions";

export const metadata: Metadata = {
  title: "Practice",
};

export default async function PracticeHomePage({
  searchParams,
}: {
  searchParams: Promise<{ locked?: string; bank?: string }>;
}) {
  const student = await requireRole(Role.STUDENT);
  const params = await searchParams;

  const [profile, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: student.id },
      select: {
        institute: { select: { name: true, logoUrl: true } },
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

  return (
    <AppShell
      user={student}
      instituteName={profile?.institute.name ?? "Institute"}
      instituteLogoUrl={profile?.institute.logoUrl}
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
        <Card className="mb-8 overflow-hidden">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Current level</p>
            <h2 className="mt-1 text-xl font-bold text-foreground">
              {level.name}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary">
                <ListChecks className="h-3.5 w-3.5" />
                {level.questionCount} questions
              </Badge>
              <Badge variant="secondary">
                <Clock className="h-3.5 w-3.5" />
                {effectiveTimeLimitSeconds ?? level.timeLimitSeconds}s
                {hasTimeOverride && (
                  <span className="sr-only"> (group override)</span>
                )}
              </Badge>
              <Badge variant="secondary">
                <Target className="h-3.5 w-3.5" />
                pass at {level.passAccuracy}%
              </Badge>
              {isLocked && (
                <Badge variant="warning">
                  <Lock className="h-3.5 w-3.5" />
                  Locked
                </Badge>
              )}
            </div>
            {hasTimeOverride && (
              <p className="mt-3 text-sm text-muted-foreground">
                Your group uses a {effectiveTimeLimitSeconds}s time limit for
                this level (institute default is {level.timeLimitSeconds}s).
              </p>
            )}

            {isLocked && access?.message ? (
              <p className="mt-6 text-sm text-muted-foreground">
                {access.message} Ask your teacher if you think this is a mistake.
              </p>
            ) : (
              <>
                <div className="mt-6 flex flex-wrap gap-3">
                  <form action={startSessionAction}>
                    <Button type="submit" size="lg">
                      Start practice
                    </Button>
                  </form>
                  <form action={startSessionAction}>
                    <input type="hidden" name="mode" value="challenge" />
                    <Button type="submit" size="lg" variant="secondary">
                      <Zap className="h-4 w-4" />
                      Challenge
                    </Button>
                  </form>
                  <form action={startSessionAction}>
                    <input type="hidden" name="mode" value="review" />
                    <Button type="submit" size="lg" variant="outline">
                      Review (no timer)
                    </Button>
                  </form>
                </div>
                {challengeTimeLimitSeconds != null &&
                  challengePassAccuracy != null && (
                    <p className="mt-4 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Challenge mode:
                      </span>{" "}
                      {challengeTimeLimitSeconds}s timer · pass at{" "}
                      {challengePassAccuracy}% · no level-up
                    </p>
                  )}
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={Target}
          title="No level assigned yet"
          description="Your teacher hasn’t assigned a level yet. Check back soon."
          className="mb-8"
        />
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Recent attempts
      </h2>
      {sessions.length === 0 ? (
        <EmptyState title="No attempts yet" description="Start a practice session to see your history here." />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{s.level.name}</p>
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
                    <Badge variant="warning">In progress</Badge>
                  ) : (
                    <>
                      <span className="font-semibold tabular-nums text-foreground">
                        {s.accuracy}%
                      </span>
                      <Badge variant={s.passed ? "success" : "muted"}>
                        {s.passed ? "Passed" : "Try again"}
                      </Badge>
                      {s.leveledUp && <Badge>Leveled up</Badge>}
                      {!s.passed && s.mode === PracticeMode.STANDARD && (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/student/practice/${s.id}`}>
                              View results
                            </Link>
                          </Button>
                        )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </AppShell>
  );
}
