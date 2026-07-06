import type { Metadata } from "next";
import Link from "next/link";

import { listGroupLevelTimeRules } from "@/server/teacher";
import { loadTeacherGroupPageContext } from "@/server/teacher-page";
import { TeacherGroupShell } from "@/components/teacher/teacher-group-shell";
import { GroupLevelTimeRules } from "@/components/teacher/group-level-time-rules";
import { DeleteGroupSection } from "@/components/teacher/delete-group-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Group settings",
};

export default async function GroupSettingsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { teacher, institute, group } = await loadTeacherGroupPageContext(groupId);
  const timeRules = await listGroupLevelTimeRules(teacher, groupId);

  return (
    <TeacherGroupShell
      user={teacher}
      institute={institute}
      groupId={groupId}
      groupName={group.name}
      subtitle="Per-group timers, question overrides, and group deletion."
    >
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Question bank overrides</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enable or disable institute questions for students in this group.
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <Button asChild variant="outline">
            <Link href={`/teacher/groups/${groupId}/questions`}>
              Manage question overrides
            </Link>
          </Button>
        </CardContent>
      </Card>

      {timeRules && timeRules.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-base">Level time limits</CardTitle>
            <p className="text-sm text-muted-foreground">
              Override the institute default timer for students in this group.
              Leave blank and save to use the level default.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <GroupLevelTimeRules groupId={group.id} rules={timeRules} />
          </CardContent>
        </Card>
      )}

      <Card className="mt-8 border-destructive/20">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteGroupSection
            groupId={group.id}
            groupName={group.name}
            studentCount={group.students.length}
          />
        </CardContent>
      </Card>
    </TeacherGroupShell>
  );
}
