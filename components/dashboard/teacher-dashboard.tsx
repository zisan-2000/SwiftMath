import type { TeacherDashboardAnalytics } from "@/server/analytics";
import { formatSpeedDuration } from "@/lib/practice-speed";
import { PracticeActivityChart } from "@/components/practice-activity-chart";
import { TeacherProgressChart } from "@/components/teacher/teacher-progress-chart";
import { TeacherGroupComparisonChart } from "@/components/teacher/teacher-group-comparison-chart";
import { GroupCompletionTable } from "@/components/teacher/group-completion-table";
import { TeachingFocus } from "./teaching-focus";
import {
  DashboardLink,
  DashboardMetric,
  DashboardNotice,
  DashboardSection,
} from "./dashboard-primitives";

export interface TeacherDashboardProps {
  teacherName: string;
  groups: { id: string; name: string }[];
  studentCount: number;
  analytics: TeacherDashboardAnalytics | null;
  canManageHomework: boolean;
  canScheduleExams: boolean;
  canManagePerformance: boolean;
}

export function TeacherDashboard({
  teacherName,
  groups,
  studentCount,
  analytics,
  canManageHomework,
  canScheduleExams,
  canManagePerformance,
}: TeacherDashboardProps) {
  return (
    <div className="dashboard-page teacher-dashboard" data-dashboard="teacher">
      <section className="teacher-studio-hero" aria-label="Teaching workspace">
        <div>
          <p className="dashboard-eyebrow">Teaching productivity studio</p>
          <h2 className="dashboard-display">
            {teacherName.split(" ")[0] || teacherName}&apos;s teaching desk
          </h2>
          <p className="dashboard-description">
            Review learning gaps, choose a class, and get straight to work.
          </p>
        </div>
        <div className="teacher-studio-summary">
          <div>
            <strong>{groups.length}</strong>
            <p className="dashboard-caption">Assigned groups</p>
          </div>
          <div>
            <strong>{studentCount}</strong>
            <p className="dashboard-caption">Students in your care</p>
          </div>
        </div>
      </section>
      <TeachingFocus
        rows={analytics?.groupCompletion ?? null}
        groups={groups}
        canManageHomework={canManageHomework}
        canScheduleExams={canScheduleExams}
        canManagePerformance={canManagePerformance}
      />
      {analytics && (
        <>
          <DashboardSection
            eyebrow="A look at learning"
            title="Practice performance"
            description="Finished timed practice in your assigned groups · last 7 days"
          >
            <div className="dashboard-metric-strip">
              <DashboardMetric
                label="Practice sessions"
                value={analytics.practice.totalSessions}
                detail={`${analytics.practice.passedSessions} passed attempts`}
              />
              <DashboardMetric
                label="Pass rate"
                value={
                  analytics.practice.totalSessions
                    ? `${analytics.practice.passRate}%`
                    : "—"
                }
                detail="Passed / finished attempts"
              />
              <DashboardMetric
                label="Average accuracy"
                value={
                  analytics.practice.totalSessions
                    ? `${analytics.practice.avgAccuracy}%`
                    : "—"
                }
                detail="Across finished attempts"
              />
              <DashboardMetric
                label="Average pass time"
                value={formatSpeedDuration(analytics.speed.avgPassMs)}
                detail="Among passed attempts"
              />
            </div>
          </DashboardSection>
          {analytics.practice.totalSessions > 0 ? (
            <div className="grid min-w-0 gap-5 xl:grid-cols-2">
              <PracticeActivityChart
                data={analytics.practice.daily}
                empty={!analytics.practice.totalSessions}
              />
              <TeacherProgressChart
                data={analytics.dailyProgress}
                empty={!analytics.practice.totalSessions}
              />
            </div>
          ) : (
            <DashboardNotice title="No finished timed practice this week">
              Your students’ next practice will bring this space to life. Open a
              group to help them get started.
            </DashboardNotice>
          )}
          <DashboardSection
            eyebrow="Know your classes"
            title="Every group, its own story"
            description="Who is practising, who is passing, and where to focus next."
            action={
              <DashboardLink href="/teacher/groups">
                All assigned groups
              </DashboardLink>
            }
          >
            <GroupCompletionTable rows={analytics.groupCompletion} />
          </DashboardSection>
          {analytics.practice.totalSessions > 0 && (
            <TeacherGroupComparisonChart
              data={analytics.groupComparison}
              empty={!groups.length || !analytics.practice.totalSessions}
            />
          )}
        </>
      )}
    </div>
  );
}
