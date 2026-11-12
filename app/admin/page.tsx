import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ACTIVE_LEVEL_FILTER } from "@/lib/active-levels";
import { Role, SessionStatus } from "@/lib/generated/prisma/enums";
import { PERMISSIONS } from "@/lib/permissions";
import { can } from "@/server/permissions";
import { getInstitutePracticeAnalytics } from "@/server/analytics";
import { loadAdminPageContext } from "@/server/admin-page";
import {
  buildAdminOnboardingSteps,
  isAdminOnboardingComplete,
} from "@/lib/admin-onboarding";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminDashboardPage() {
  const { admin: user, institute } = await loadAdminPageContext();
  const { instituteId } = user;
  const [viewAnalytics, viewActivity, viewReports] = await Promise.all([
    can(user, PERMISSIONS.ANALYTICS_VIEW),
    can(user, PERMISSIONS.ACTIVITY_VIEW),
    can(user, PERMISSIONS.REPORT_VIEW),
  ]);
  const [
    teachers,
    students,
    groups,
    levels,
    academicLevels,
    practice,
    finishedSessions,
    activity,
  ] = await Promise.all([
    prisma.user.count({ where: { instituteId, role: Role.TEACHER } }),
    prisma.user.count({ where: { instituteId, role: Role.STUDENT } }),
    prisma.group.count({ where: { instituteId } }),
    prisma.level.count({ where: { instituteId, ...ACTIVE_LEVEL_FILTER } }),
    prisma.academicLevel.count({ where: { instituteId, isActive: true } }),
    viewAnalytics ? getInstitutePracticeAnalytics(instituteId) : null,
    viewAnalytics
      ? prisma.practiceSession.count({
          where: { instituteId, status: { not: SessionStatus.IN_PROGRESS } },
        })
      : null,
    viewActivity
      ? prisma.auditLog.findMany({
          where: { instituteId },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: {
            id: true,
            summary: true,
            createdAt: true,
            actor: { select: { name: true } },
          },
        })
      : null,
  ]);
  const steps = buildAdminOnboardingSteps({
    teachers,
    groups,
    students,
    practiceSessions: finishedSessions ?? 0,
  }).filter((step) => viewAnalytics || step.id !== "practice");
  return (
    <AdminPageShell
      dashboard
      user={user}
      institute={institute}
      title="Institute overview"
      subtitle="A thoughtful view of everything you are building."
      actions={
        <InstallAppButton appName={institute?.name ?? APP_NAME} size="sm" />
      }
    >
      <AdminDashboard
        instituteName={institute?.name ?? "Your institute"}
        teachers={teachers}
        students={students}
        groups={groups}
        levels={levels}
        academicLevels={academicLevels}
        practice={practice}
        onboarding={isAdminOnboardingComplete(steps) ? null : steps}
        activity={
          activity?.map((event) => ({
            id: event.id,
            summary: event.summary,
            createdAt: event.createdAt.toISOString(),
            actorName: event.actor.name,
          })) ?? null
        }
        canViewReports={viewReports}
      />
    </AdminPageShell>
  );
}
