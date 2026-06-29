import type { Metadata } from "next";
import { Clock, ListChecks, Lock, Target } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role, SessionStatus, PracticeMode } from "@/lib/generated/prisma/enums";
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
  searchParams: Promise<{ locked?: string }>;
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
  const access = level
    ? await checkStudentLevelAccess(
        student.id,
        student.instituteId,
        level.id,
      )
    : null;
  const isLocked = access != null && !access.allowed;

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
              <div className="mt-6 flex flex-wrap gap-3">
                <form action={startSessionAction}>
                  <Button type="submit" size="lg">
                    Start practice
                  </Button>
                </form>
                <form action={startSessionAction}>
                  <input type="hidden" name="mode" value="review" />
                  <Button type="submit" size="lg" variant="outline">
                    Review (no timer)
                  </Button>
                </form>
              </div>
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
                  {s.status === SessionStatus.IN_PROGRESS ? (
                    <Badge variant="warning">In progress</Badge>
                  ) : (
                    <>
                      <span className="font-semibold tabular-nums text-foreground">
                        {s.accuracy}%
                      </span>
                      <Badge variant={s.passed ? "success" : "muted"}>
                        {s.passed ? "Passed" : "Not passed"}
                      </Badge>
                      {s.leveledUp && <Badge>Leveled up</Badge>}
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
