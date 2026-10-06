import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getStudentProgress, listTeacherGroups } from "@/server/teacher";
import { getStudentClassPerformanceForTeacher } from "@/server/class-performance";
import { loadTeacherGroupPageContext } from "@/server/teacher-page";
import { TeacherGroupShell } from "@/components/teacher/teacher-group-shell";
import { StudentProgressPanel } from "@/components/student-progress-panel";
import { ClassPerformanceHistory } from "@/components/class-performance-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { moveStudentAction } from "./actions";
import { assignAcademicLevelAction } from "./actions";
import { getTeacherStudentAcademicLevel, listAcademicLevels } from "@/server/academic-levels";

export const metadata: Metadata = {
  title: "Student progress",
};

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function StudentProgressPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string; studentId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { groupId, studentId } = await params;
  const { teacher, institute, group } = await loadTeacherGroupPageContext(groupId);

  const [progress, groups, classPerformance, academicLevels, academicAssignment, query] = await Promise.all([
    getStudentProgress(teacher, groupId, studentId),
    listTeacherGroups(teacher.id),
    getStudentClassPerformanceForTeacher(teacher, groupId, studentId),
    listAcademicLevels(teacher.instituteId),
    getTeacherStudentAcademicLevel({ id: teacher.id, instituteId: teacher.instituteId, role: teacher.role }, groupId, studentId),
    searchParams,
  ]);

  if (!progress) {
    notFound();
  }

  const { student } = progress;
  const otherGroups = groups.filter((g) => g.id !== groupId);

  return (
    <TeacherGroupShell
      user={teacher}
      institute={institute}
      groupId={groupId}
      groupName={group.name}
      title={student.name}
      subtitle={student.email}
      backHref={`/teacher/groups/${groupId}/students`}
      backLabel="Back to students"
    >
      <StudentProgressPanel progress={progress} />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Academic Level</CardTitle>
          <p className="text-sm text-muted-foreground">Teacher-controlled main/offline level. This does not change the student&apos;s Practice/Exam level.</p>
        </CardHeader>
        <CardContent>
          {(query.error || query.success) && <p className={`mb-4 text-sm ${query.error ? "text-destructive" : "text-success"}`}>{query.error ?? query.success}</p>}
          <form action={assignAcademicLevelAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="studentId" value={studentId} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="academic-level">Academic Level</Label>
              <select id="academic-level" name="academicLevelId" defaultValue={academicAssignment?.academicLevelId ?? ""} className={SELECT_CLASS}>
                <option value="">— Unassigned —</option>
                {academicLevels.map((level) => <option key={level.id} value={level.id}>{level.orderIndex}. {level.name}</option>)}
              </select>
            </div>
            <Button type="submit" variant="outline">Save Academic Level</Button>
          </form>
        </CardContent>
      </Card>

      {classPerformance ? (
        <ClassPerformanceHistory history={classPerformance} />
      ) : null}

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
    </TeacherGroupShell>
  );
}
