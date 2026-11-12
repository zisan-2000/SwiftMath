import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, Play } from "lucide-react";
import { startSessionAction } from "@/app/student/practice/actions";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { prisma } from "@/lib/prisma";
import { PracticeMode } from "@/lib/generated/prisma/enums";
import { getStudentPracticeAnalytics } from "@/server/analytics";
import { getStudentInProgressSession } from "@/server/practice";
import { getStudentInstituteRank } from "@/server/ranking";
import { getStudentGamificationSummary } from "@/server/student-gamification";
import { getOwnClassPerformanceHistory } from "@/server/class-performance";
import { getStudentPendingScheduledExam } from "@/server/scheduled-exam";
import { syncStudentScheduledExamNotifications } from "@/server/notifications";
import { loadStudentPageContext } from "@/server/student-page";
import { startExamAction } from "@/app/student/actions";
import { StudentPageShell } from "@/components/student/student-page-shell";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Student",
};

function formatExamDeadline(date: Date): string {
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function resolveExamErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  if (code === "locked") {
    return "This exam level is locked for you. Ask your teacher if you think this is a mistake.";
  }
  try {
    return decodeURIComponent(code);
  } catch {
    return code;
  }
}

/**
 * STUDENT dashboard. Shows current group and level with shortcuts to practice
 * and ranking.
 */
export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ examError?: string }>;
}) {
  const { examError } = await searchParams;
  const examErrorMessage = resolveExamErrorMessage(examError);

  const { student: user, institute } = await loadStudentPageContext();

  await syncStudentScheduledExamNotifications(user.id, user.instituteId);

  const [
    profile,
    practice,
    pendingSession,
    pendingExam,
    instituteRank,
    gamification,
    classPerformance,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        group: { select: { name: true } },
        currentLevel: { select: { name: true } },
        academicLevel: { select: { name: true } },
      },
    }),
    getStudentPracticeAnalytics(user.id),
    getStudentInProgressSession(user.id),
    getStudentPendingScheduledExam(user.id),
    getStudentInstituteRank(user.id, user.instituteId),
    getStudentGamificationSummary(user.id),
    getOwnClassPerformanceHistory(user.id, user.instituteId),
  ]);

  const showPracticeInProgress =
    pendingSession != null && pendingSession.mode !== PracticeMode.EXAM;

  const examBlockedByPractice =
    pendingExam != null &&
    pendingExam.inProgressSessionId == null &&
    pendingSession != null &&
    pendingSession.mode !== PracticeMode.EXAM;

  const nextAction = pendingExam ? (
    <>
      <p className="dashboard-eyebrow">
        {pendingExam.inProgressSessionId
          ? "Exam in progress"
          : "Scheduled exam available"}
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight">
        {pendingExam.title ?? "Scheduled exam"}
      </h3>
      <p className="dashboard-description">
        {pendingExam.level.name} · pass at {pendingExam.level.passAccuracy}% ·
        closes {formatExamDeadline(pendingExam.closesAt)}
      </p>
      {examBlockedByPractice && (
        <p className="mb-3 text-sm text-muted-foreground">
          Finish your current practice session before starting this exam.
        </p>
      )}
      {pendingExam.inProgressSessionId ? (
        <Button asChild size="lg">
          <Link href={`/student/practice/${pendingExam.inProgressSessionId}`}>
            <Play className="size-4" />
            Resume exam
          </Link>
        </Button>
      ) : examBlockedByPractice ? (
        <Button asChild size="lg" variant="secondary">
          <Link href={`/student/practice/${pendingSession!.id}`}>
            <Play className="size-4" />
            Resume practice
          </Link>
        </Button>
      ) : (
        <form action={startExamAction}>
          <input type="hidden" name="scheduledExamId" value={pendingExam.id} />
          <Button type="submit" size="lg">
            <ClipboardCheck className="size-4" />
            Start exam
          </Button>
        </form>
      )}
    </>
  ) : showPracticeInProgress && pendingSession ? (
    <>
      <p className="dashboard-eyebrow">Practice in progress</p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight">
        {pendingSession.level.name}
      </h3>
      <p className="dashboard-description">
        {pendingSession.mode === PracticeMode.REVIEW
          ? "Review mode — no timer"
          : pendingSession.mode === PracticeMode.CHALLENGE
            ? "Challenge mode — harder timed drill"
            : "Timed practice — pick up where you left off"}
      </p>
      <Button asChild size="lg">
        <Link href={`/student/practice/${pendingSession.id}`}>
          <Play className="size-4" />
          Resume practice
        </Link>
      </Button>
    </>
  ) : profile?.currentLevel ? (
    <>
      <p className="dashboard-eyebrow">Your next step</p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight">
        Your next practice
      </h3>
      <p className="dashboard-description">
        Continue with {profile.currentLevel.name}. Your next session is ready
        when you are.
      </p>
      <form action={startSessionAction}>
        <Button type="submit" size="lg">
          <Play className="size-4" />
          Start practice
        </Button>
      </form>
      <div className="mt-3">
        <Link href="/student/practice" className="dashboard-text-link">
          More practice options
        </Link>
      </div>
    </>
  ) : (
    <>
      <p className="dashboard-eyebrow">Teacher assignment</p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight">
        Your starting point is coming.
      </h3>
      <p className="dashboard-description">
        Your teacher has not assigned a practice sub-level yet. Ask them to
        choose your starting point.
      </p>
      <Link href="/student/homework" className="dashboard-text-link">
        Check your homework
      </Link>
    </>
  );
  return (
    <StudentPageShell
      dashboard
      user={user}
      institute={institute}
      title="Your learning space"
      subtitle={`Good to see you, ${user.name}. Make today a step forward.`}
      actions={
        <InstallAppButton appName={institute?.name ?? APP_NAME} size="sm" />
      }
    >
      {examErrorMessage && (
        <FormMessage variant="error" className="mb-6">
          {examErrorMessage}
        </FormMessage>
      )}
      <StudentDashboard
        studentName={user.name}
        academicLevel={profile?.academicLevel?.name ?? null}
        currentLevel={profile?.currentLevel?.name ?? null}
        groupName={profile?.group?.name ?? null}
        practice={practice}
        gamification={gamification}
        rank={instituteRank}
        classPerformance={classPerformance}
        nextAction={nextAction}
      />
    </StudentPageShell>
  );
}
