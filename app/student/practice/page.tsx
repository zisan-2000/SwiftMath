import type { Metadata } from "next";
import { Clock, ListChecks, Target } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role, SessionStatus } from "@/lib/generated/prisma/enums";
import { listRecentSessions } from "@/server/practice";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { startSessionAction } from "./actions";

export const metadata: Metadata = {
  title: `Practice · ${APP_NAME}`,
};

export default async function PracticeHomePage() {
  const student = await requireRole(Role.STUDENT);

  const [profile, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: student.id },
      select: {
        institute: { select: { name: true } },
        currentLevel: {
          select: {
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

  return (
    <AppShell
      user={student}
      instituteName={profile?.institute.name ?? "Institute"}
      title="Practice"
      subtitle="Timed practice at your current level."
    >
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
                {level.timeLimitSeconds}s
              </Badge>
              <Badge variant="secondary">
                <Target className="h-3.5 w-3.5" />
                pass at {level.passAccuracy}%
              </Badge>
            </div>
            <form action={startSessionAction} className="mt-6">
              <Button type="submit" size="lg">
                Start practice
              </Button>
            </form>
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
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{s.level.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.createdAt.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
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
