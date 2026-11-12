import {
  AbacusIllustration,
  LearningJourney,
  WeeklyPracticeBeads,
} from "./learning-journey";
import type { ReactNode } from "react";
import { BookMarked, Flame, Play, Trophy } from "lucide-react";
import type { InstitutePracticeAnalytics } from "@/server/analytics";
import type { StudentGamificationSummary } from "@/server/student-gamification";
import type { StudentClassPerformanceHistory } from "@/components/class-performance-history";
import { PracticeActivityChart } from "@/components/practice-activity-chart";
import { StudentBadgesPanel } from "@/components/student/student-badges-panel";
import {
  DashboardLink,
  DashboardMetric,
  DashboardNotice,
  DashboardSection,
} from "./dashboard-primitives";

export interface StudentDashboardProps {
  studentName: string;
  academicLevel: string | null;
  currentLevel: string | null;
  groupName: string | null;
  practice: InstitutePracticeAnalytics;
  gamification: StudentGamificationSummary;
  rank: { rank: number | null; totalQualified: number };
  classPerformance: StudentClassPerformanceHistory;
  nextAction: ReactNode;
}

function AcademicRecords({
  rows,
}: {
  rows: StudentClassPerformanceHistory["rows"];
}) {
  return (
    <div>
      {rows.map((row) => (
        <article
          className="student-class-row"
          key={`${row.date}:${row.groupName}`}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{row.label}</p>
            <p className="dashboard-caption break-words">
              {row.groupName} ·{" "}
              {row.status === "ABSENT" ? "Absent · counted as zero" : "Present"}
            </p>
          </div>
          <div className="text-right">
            <strong className="block text-sm font-semibold tabular-nums">
              {row.mark}
              <span className="font-normal text-muted-foreground">
                {" "}
                / {row.maximumMark}
              </span>
            </strong>
            <span className="dashboard-caption">{row.percentage}%</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function StudentDashboard({
  studentName,
  academicLevel,
  currentLevel,
  groupName,
  practice,
  gamification,
  rank,
  classPerformance,
  nextAction,
}: StudentDashboardProps) {
  return (
    <div className="dashboard-page student-dashboard" data-dashboard="student">
      <section
        className="student-learning-hero"
        aria-label="Your personal learning space"
      >
        <div className="student-hero-copy">
          <p className="dashboard-eyebrow">Your personal learning journey</p>
          <h2 className="dashboard-display">
            Ready for your next
            <br />
            <em>“I did it!”</em>
          </h2>
          <p className="dashboard-description">
            Welcome back, {studentName.split(" ")[0] || studentName}.
            {currentLevel
              ? `Let’s keep building with ${currentLevel}.`
              : "Your teacher will help you get started."}
          </p>
          <div className="student-identity">
            <span>
              Academic level<strong>{academicLevel ?? "Not assigned"}</strong>
            </span>
            <span>
              Your group<strong>{groupName ?? "Not assigned"}</strong>
            </span>
          </div>
          <div className="student-hero-highlights">
            <span>
              <Flame className="size-4" aria-hidden="true" />
              <strong>{gamification.streakDays}</strong> day streak
            </span>
            <span>
              <Trophy className="size-4" aria-hidden="true" />
              <strong>{gamification.earnedBadgeCount}</strong> badges earned
            </span>
          </div>
          <AbacusIllustration />
        </div>
        <div className="student-next-action">{nextAction}</div>
      </section>

      <div className="student-journey-layout">
        <LearningJourney currentLevel={currentLevel} stats={gamification} />
        <WeeklyPracticeBeads stats={gamification} days={practice.daily} />
      </div>

      <DashboardSection
        eyebrow="Real effort. Real results."
        title="Your practice highlights"
        description="Finished timed practice · last 7 days"
        action={
          <DashboardLink href="/student/ranking">
            Practice ranking
          </DashboardLink>
        }
      >
        <div className="dashboard-metric-strip">
          <DashboardMetric
            label="Practice sessions"
            value={practice.totalSessions}
            detail={`${practice.passedSessions} passed attempts`}
            icon={Play}
          />
          <DashboardMetric
            label="Pass rate"
            value={practice.totalSessions ? `${practice.passRate}%` : "—"}
            detail="Passed / finished attempts"
          />
          <DashboardMetric
            label="Average accuracy"
            value={practice.totalSessions ? `${practice.avgAccuracy}%` : "—"}
            detail="Across finished attempts"
          />
          <DashboardMetric
            label="Institute rank"
            value={
              rank.rank == null ? (
                <span className="dashboard-value-text">Not ranked yet</span>
              ) : (
                `#${rank.rank}`
              )
            }
            detail={
              rank.rank == null
                ? "100% accuracy on every timed attempt and on-time passes are required"
                : `Of ${rank.totalQualified} qualified learners · all time`
            }
            icon={Trophy}
          />
        </div>
      </DashboardSection>

      {practice.totalSessions > 0 ? (
        <PracticeActivityChart
          data={practice.daily}
          empty={!practice.totalSessions}
          description="Your finished timed attempts over the last 7 days"
        />
      ) : (
        <DashboardNotice title="A fresh start for your practice" icon={Play}>
          Finish a timed practice to see your activity here. Your results will
          always come from your own attempts.
        </DashboardNotice>
      )}

      <DashboardSection
        eyebrow="Learning beyond practice"
        title="Your class performance"
        description="Teacher-entered marks. Always separate from practice and exam ranking."
      >
        <div className="dashboard-panel">
          <div className="student-academic-summary">
            <div>
              <p className="dashboard-caption">Recorded classes</p>
              <strong>{classPerformance.classCount}</strong>
            </div>
            <div>
              <p className="dashboard-caption">Performance</p>
              <strong>
                {classPerformance.classCount
                  ? `${classPerformance.overallPercentage}%`
                  : "—"}
              </strong>
            </div>
            <div>
              <p className="dashboard-caption">Absent</p>
              <strong>{classPerformance.absentCount}</strong>
            </div>
          </div>
          {classPerformance.rows.length ? (
            <>
              <AcademicRecords rows={classPerformance.rows.slice(0, 4)} />
              {classPerformance.rows.length > 4 && (
                <details className="mt-4 rounded-lg border border-border px-4">
                  <summary className="cursor-pointer py-3 text-sm font-medium text-primary focus-visible:outline-2 focus-visible:outline-ring">
                    View all {classPerformance.rows.length} class records
                  </summary>
                  <AcademicRecords rows={classPerformance.rows.slice(4)} />
                </details>
              )}
            </>
          ) : (
            <DashboardNotice
              title="Your classroom story starts soon"
              icon={BookMarked}
            >
              When your teacher records class marks, your date-wise performance
              and attendance will appear here.
            </DashboardNotice>
          )}
        </div>
      </DashboardSection>

      <StudentBadgesPanel badges={gamification.badges} stats={gamification} />
    </div>
  );
}
