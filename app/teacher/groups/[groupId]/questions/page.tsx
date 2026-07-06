import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { listInstituteLevels } from "@/server/teacher";
import { listGroupQuestionOverrides } from "@/server/question-bank";
import { loadTeacherGroupPageContext } from "@/server/teacher-page";
import { TeacherGroupShell } from "@/components/teacher/teacher-group-shell";
import { GroupQuestionOverrides } from "@/components/teacher/group-question-overrides";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  const { groupId } = await params;
  const { group } = await loadTeacherGroupPageContext(groupId);
  return { title: `${group.name} — Questions` };
}

export default async function GroupQuestionBankPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ levelId?: string }>;
}) {
  const { groupId } = await params;
  const { levelId: levelIdParam } = await searchParams;
  const { teacher, institute, group } = await loadTeacherGroupPageContext(groupId);
  const levels = await listInstituteLevels(teacher.instituteId);

  const levelId =
    levelIdParam && levels.some((l) => l.id === levelIdParam)
      ? levelIdParam
      : levels[0]?.id;

  const overrides =
    levelId != null
      ? await listGroupQuestionOverrides(teacher, groupId, levelId)
      : null;

  if (levelId && overrides == null) {
    notFound();
  }

  return (
    <TeacherGroupShell
      user={teacher}
      institute={institute}
      groupId={groupId}
      groupName={group.name}
      subtitle="Enable or disable institute bank questions for this group."
    >
      {levels.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No levels exist yet. Ask your admin to create levels and bank questions.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {levels.map((level) => (
              <Button
                key={level.id}
                asChild
                variant={level.id === levelId ? "default" : "outline"}
                size="sm"
              >
                <Link
                  href={`/teacher/groups/${group.id}/questions?levelId=${level.id}`}
                >
                  {level.orderIndex}. {level.name}
                </Link>
              </Button>
            ))}
          </div>

          <Card className="mt-6">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base">Group overrides</CardTitle>
              <p className="text-sm text-muted-foreground">
                Disabled questions are skipped for students in this group.
                Remaining slots use dynamic generation.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {levelId && overrides && (
                <GroupQuestionOverrides
                  groupId={group.id}
                  levelId={levelId}
                  rows={overrides}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </TeacherGroupShell>
  );
}
