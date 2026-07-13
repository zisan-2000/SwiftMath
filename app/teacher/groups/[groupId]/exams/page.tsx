import type { Metadata } from "next";

import { listInstituteLevels } from "@/server/teacher";
import { listGroupScheduledExams } from "@/server/scheduled-exam";
import { loadTeacherGroupPageContext } from "@/server/teacher-page";
import { TeacherGroupShell } from "@/components/teacher/teacher-group-shell";
import { TeacherScheduledExams } from "@/components/teacher/teacher-scheduled-exams";
import { ScheduleExamForm } from "@/components/teacher/schedule-exam-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Group exams",
};

export default async function GroupExamsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { teacher, institute, group } = await loadTeacherGroupPageContext(groupId);

  const [levels, scheduledExams] = await Promise.all([
    listInstituteLevels(teacher.instituteId),
    listGroupScheduledExams(teacher, groupId),
  ]);

  const exams = scheduledExams.map((exam) => ({
    id: exam.id,
    title: exam.title,
    opensAt: exam.opensAt,
    closesAt: exam.closesAt,
    level: exam.level,
    attemptCount: exam._count.practiceSessions,
    paperQuestionCount: exam._count.paperQuestions,
  }));

  // eslint-disable-next-line react-hooks/purity -- request-time exam window status
  const nowMs = Date.now();

  return (
    <TeacherGroupShell
      user={teacher}
      institute={institute}
      groupId={groupId}
      groupName={group.name}
      subtitle="Schedule exam windows — students see open exams on their dashboard."
    >
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Scheduled exams</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each student gets one timed attempt using the same fixed question
            paper.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <TeacherScheduledExams
            exams={exams}
            nowMs={nowMs}
            layout="list"
            groupId={groupId}
            emptyDescription="Schedule an exam window so students see it on their dashboard."
          />
        </CardContent>
        <CardContent className="border-t border-border pt-6">
          <ScheduleExamForm
            groupId={group.id}
            levels={levels.map((level) => ({
              id: level.id,
              orderIndex: level.orderIndex,
              name: level.name,
            }))}
          />
        </CardContent>
      </Card>
    </TeacherGroupShell>
  );
}
