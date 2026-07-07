import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ScrollText } from "lucide-react";

import {
  parseTeacherActivityGroupFilter,
  teacherActivityHref,
} from "@/lib/audit-log";
import { parsePageParam } from "@/lib/pagination";
import { listTeacherAuditLogs } from "@/server/audit-log";
import { getTeacherGroup } from "@/server/teacher";
import { loadTeacherPageContext } from "@/server/teacher-page";
import { TeacherPageShell } from "@/components/teacher/teacher-page-shell";
import { BackLink } from "@/components/nav/back-link";
import { TeacherActivityList } from "@/components/teacher/teacher-activity-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Your activity",
};

export default async function TeacherActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; group?: string }>;
}) {
  const { teacher, institute } = await loadTeacherPageContext();
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const groupId = parseTeacherActivityGroupFilter(params.group);

  if (groupId) {
    const group = await getTeacherGroup(teacher, groupId);
    if (!group) {
      notFound();
    }
  }

  const [activity, scopedGroup] = await Promise.all([
    listTeacherAuditLogs(teacher, { page, groupId }),
    groupId ? getTeacherGroup(teacher, groupId) : Promise.resolve(null),
  ]);

  if (page > activity.totalPages && activity.total > 0) {
    redirect(teacherActivityHref({ groupId, page: activity.totalPages }));
  }

  const subtitle = groupId && scopedGroup
    ? `Question override changes you made in ${scopedGroup.name}.`
    : "Your question enable/disable changes across all groups.";

  return (
    <TeacherPageShell
      user={teacher}
      institute={institute}
      title="Your activity"
      subtitle={subtitle}
    >
      <BackLink href={groupId ? `/teacher/groups/${groupId}` : "/teacher/groups"}>
        {groupId ? "Back to group" : "All groups"}
      </BackLink>

      <p className="mt-6 text-sm text-muted-foreground">
        Read-only history of your group question overrides. Admin institute
        changes and other teachers&apos; actions are not shown here.
      </p>

      {groupId && scopedGroup && (
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/teacher/activity">Show all groups</Link>
          </Button>
        </div>
      )}

      <Card className="mt-6 overflow-hidden">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Recent changes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TeacherActivityList
            items={activity.items}
            emptyDescription={
              groupId
                ? "You have not changed any question overrides for this group yet."
                : "You have not changed any question overrides yet."
            }
            pagination={{
              groupId,
              page: activity.page,
              pageSize: activity.pageSize,
              total: activity.total,
              totalPages: activity.totalPages,
            }}
          />
        </CardContent>
      </Card>

      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <ScrollText className="size-3.5 shrink-0" aria-hidden />
        Only your own group question enable/disable actions are listed.
      </p>
    </TeacherPageShell>
  );
}
