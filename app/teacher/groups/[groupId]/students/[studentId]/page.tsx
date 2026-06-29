import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getStudentProgress, listTeacherGroups } from "@/server/teacher";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { StudentProgressPanel } from "@/components/student-progress-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { moveStudentAction } from "./actions";

export const metadata: Metadata = {
  title: "Student progress",
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
      select: { name: true, logoUrl: true },
    }),
    getStudentProgress(teacher, groupId, studentId),
    listTeacherGroups(teacher.id),
  ]);

  if (!progress) {
    notFound();
  }

  const { student } = progress;
  const otherGroups = groups.filter((g) => g.id !== groupId);

  return (
    <AppShell
      user={teacher}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title={student.name}
      subtitle={student.email}
    >
      <BackLink href={`/teacher/groups/${groupId}`}>Back to group</BackLink>

      <StudentProgressPanel progress={progress} />

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
