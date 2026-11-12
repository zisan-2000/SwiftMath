import type { Metadata } from "next";
import { can } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { teacherGroupScope } from "@/server/group-access";
import { prisma } from "@/lib/prisma";
import { getTeacherDashboardAnalytics } from "@/server/analytics";
import { syncTeacherExamClosedNotifications } from "@/server/notifications";
import { loadTeacherPageContext } from "@/server/teacher-page";
import { TeacherPageShell } from "@/components/teacher/teacher-page-shell";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { APP_NAME } from "@/lib/constants";
export const metadata: Metadata = { title: "Teacher" };
export default async function TeacherDashboardPage() {
  const { teacher, institute } = await loadTeacherPageContext();
  await syncTeacherExamClosedNotifications(teacher.id, teacher.instituteId);
  const [
    viewAnalytics,
    canManageHomework,
    canScheduleExams,
    canManagePerformance,
  ] = await Promise.all([
    can(teacher, PERMISSIONS.ANALYTICS_VIEW),
    can(teacher, PERMISSIONS.HOMEWORK_MANAGE),
    can(teacher, PERMISSIONS.EXAM_SCHEDULE),
    can(teacher, PERMISSIONS.CLASS_PERFORMANCE_MANAGE),
  ]);
  const [groups, studentCount, analytics] = await Promise.all([
    prisma.group.findMany({
      where: teacherGroupScope(teacher),
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.count({
      where: {
        role: "STUDENT",
        instituteId: teacher.instituteId,
        group: teacherGroupScope(teacher),
      },
    }),
    viewAnalytics ? getTeacherDashboardAnalytics(teacher) : null,
  ]);
  return (
    <TeacherPageShell
      dashboard
      user={teacher}
      institute={institute}
      title="Your teaching workspace"
      subtitle="A little structure. A lot more room to teach."
      actions={
        <InstallAppButton appName={institute?.name ?? APP_NAME} size="sm" />
      }
    >
      <TeacherDashboard
        teacherName={teacher.name}
        groups={groups}
        studentCount={studentCount}
        analytics={analytics}
        canManageHomework={canManageHomework}
        canScheduleExams={canScheduleExams}
        canManagePerformance={canManagePerformance}
      />
    </TeacherPageShell>
  );
}
