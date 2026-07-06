import type { Metadata } from "next";
import Link from "next/link";
import { Boxes } from "lucide-react";

import { listTeacherGroups, listTeacherScheduledExams } from "@/server/teacher";
import { loadTeacherPageContext } from "@/server/teacher-page";
import { TeacherPageShell } from "@/components/teacher/teacher-page-shell";
import { TeacherScheduledExams } from "@/components/teacher/teacher-scheduled-exams";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Exams",
};

export default async function TeacherExamsPage() {
  const { teacher, institute } = await loadTeacherPageContext();

  const [exams, groups] = await Promise.all([
    listTeacherScheduledExams(teacher),
    listTeacherGroups(teacher.id),
  ]);

  const mapped = exams.map((exam) => ({
    id: exam.id,
    title: exam.title,
    opensAt: exam.opensAt,
    closesAt: exam.closesAt,
    level: exam.level,
    group: exam.group,
    attemptCount: exam._count.practiceSessions,
    paperQuestionCount: exam._count.paperQuestions,
  }));

  return (
    <TeacherPageShell
      user={teacher}
      institute={institute}
      title="Exams"
      subtitle="Scheduled exam windows across all your groups."
      actions={
        groups.length > 0 ? (
          <Button asChild>
            <Link href={`/teacher/groups/${groups[0]!.id}/exams`}>
              Schedule exam
            </Link>
          </Button>
        ) : undefined
      }
    >
      {groups.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Create a group first"
          description="Exams are scheduled per group. Create a group, then open its Exams tab."
          action={
            <Button asChild>
              <Link href="/teacher/groups">Go to groups</Link>
            </Button>
          }
        />
      ) : (
        <TeacherScheduledExams exams={mapped} layout="table" showGroup />
      )}
    </TeacherPageShell>
  );
}
