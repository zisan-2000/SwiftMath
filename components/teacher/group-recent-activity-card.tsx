import type { AuditLogListItem } from "@/server/audit-log";
import { teacherActivityHref } from "@/lib/audit-log";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeacherActivityList } from "@/components/teacher/teacher-activity-list";

/** Group detail snippet — last N override changes by this teacher. */
export function GroupRecentActivityCard({
  groupId,
  groupName,
  items,
  total,
}: {
  groupId: string;
  groupName: string;
  items: AuditLogListItem[];
  total: number;
}) {
  return (
    <Card className="mt-8 overflow-hidden">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-base">Your recent changes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Question overrides you enabled or disabled for {groupName}.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <TeacherActivityList
          items={items}
          emptyDescription="When you enable or disable bank questions for this group, they will appear here."
          viewAllHref={total > 0 ? teacherActivityHref({ groupId }) : undefined}
        />
      </CardContent>
    </Card>
  );
}
