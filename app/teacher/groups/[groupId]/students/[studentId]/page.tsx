import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartyPopper } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role, SessionStatus } from "@/lib/generated/prisma/enums";
import { getStudentProgress, listTeacherGroups } from "@/server/teacher";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { moveStudentAction } from "./actions";

export const metadata: Metadata = {
  title: `Student progress · ${APP_NAME}`,
};

/** Native <select> styled to match the Input component. */
const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function StudentProgressPage({
  params,
}: {
  // Next.js 16: route params are async.
  params: Promise<{ groupId: string; studentId: string }>;
}) {
  const { groupId, studentId } = await params;
  const teacher = await requireRole(Role.TEACHER);

  const [institute, progress, groups] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: teacher.instituteId },
      select: { name: true },
    }),
    getStudentProgress(teacher, groupId, studentId),
    listTeacherGroups(teacher.id),
  ]);

  if (!progress) {
    notFound();
  }

  const { student, recentSessions, stats } = progress;

  // Other groups this teacher owns, available as move targets.
  const otherGroups = groups.filter((g) => g.id !== groupId);

  return (
    <AppShell
      user={teacher}
      instituteName={institute?.name ?? "Institute"}
      title={student.name}
      subtitle={student.email}
    >
      <BackLink href={`/teacher/groups/${groupId}`}>Back to group</BackLink>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Current level"
          value={
            student.currentLevel
              ? `${student.currentLevel.orderIndex}. ${student.currentLevel.name}`
              : "Not assigned"
          }
        />
        <StatCard label="Attempts" value={stats.completed} hint="Finished" />
        <StatCard label="Passed" value={stats.passedCount} />
        <StatCard label="Avg. accuracy" value={`${stats.avgAccuracy}%`} />
        <StatCard label="Best accuracy" value={`${stats.bestAccuracy}%`} />
      </div>

      {stats.leveledUpCount > 0 && (
        <Card className="mb-8 border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-foreground">
            <PartyPopper className="h-5 w-5 shrink-0 text-primary" />
            <span>
              Leveled up {stats.leveledUpCount}{" "}
              {stats.leveledUpCount === 1 ? "time" : "times"} so far.
            </span>
          </CardContent>
        </Card>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Recent attempts
      </h2>
      {recentSessions.length === 0 ? (
        <EmptyState
          title="No attempts yet"
          description="This student hasn’t practised yet."
        />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {recentSessions.map((s) => (
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
                <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:text-right">
                  {s.status === SessionStatus.IN_PROGRESS ? (
                    <Badge variant="warning">In progress</Badge>
                  ) : (
                    <>
                      <span className="font-semibold tabular-nums text-foreground">
                        {s.accuracy}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({s.correctCount}/{s.totalQuestions})
                      </span>
                      <Badge variant={s.passed ? "success" : "muted"}>
                        {s.passed ? "Passed" : "Not passed"}
                      </Badge>
                      {s.status === SessionStatus.EXPIRED && (
                        <Badge variant="warning">Expired</Badge>
                      )}
                      {s.leveledUp && <Badge>Leveled up</Badge>}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {otherGroups.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">Move to another group</CardTitle>
            <p className="text-sm text-muted-foreground">
              Reassign this student to one of your other groups. Their level and
              history are kept.
            </p>
          </CardHeader>
          <CardContent>
            <form
              action={moveStudentAction}
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
            >
              <input type="hidden" name="studentId" value={student.id} />
              <input type="hidden" name="currentGroupId" value={groupId} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Label htmlFor="target-group">Target group</Label>
                <select
                  id="target-group"
                  name="targetGroupId"
                  defaultValue=""
                  required
                  className={SELECT_CLASS}
                >
                  <option value="" disabled>
                    Choose a group…
                  </option>
                  {otherGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" variant="outline">
                Move student
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
