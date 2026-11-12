import { Activity } from "lucide-react";
import { ManagementWorkspace } from "./management-workspace";
import type { InstitutePracticeAnalytics } from "@/server/analytics";
import type { AdminOnboardingStep } from "@/lib/admin-onboarding";
import { AdminOnboardingChecklist } from "@/components/admin/onboarding-checklist";
import { AdminPracticeInsights } from "./admin-practice-insights";
import {
  DashboardLink,
  DashboardMetric,
  DashboardNotice,
  DashboardSection,
  DashboardSparkline,
} from "./dashboard-primitives";

export interface AdminDashboardProps {
  instituteName: string;
  teachers: number;
  students: number;
  groups: number;
  levels: number;
  academicLevels: number;
  practice: InstitutePracticeAnalytics | null;
  onboarding: AdminOnboardingStep[] | null;
  activity:
    | { id: string; summary: string; actorName: string; createdAt: string }[]
    | null;
  canViewReports: boolean;
}

export function AdminDashboard({
  instituteName,
  teachers,
  students,
  groups,
  levels,
  academicLevels,
  practice,
  onboarding,
  activity,
  canViewReports,
}: AdminDashboardProps) {
  return (
    <div className="dashboard-page admin-dashboard" data-dashboard="admin">
      <section className="executive-overview" aria-label="Institute overview">
        <div className="executive-identity">
          <p className="dashboard-eyebrow">Institute command center</p>
          <h2>{instituteName}</h2>
          <p className="dashboard-caption">
            People, curriculum and learning outcomes.
          </p>
          <div className="executive-people">
            <div>
              <strong>{students.toLocaleString("en")}</strong>
              <span>Students</span>
            </div>
            <div>
              <strong>{teachers}</strong>
              <span>Teachers</span>
            </div>
            <div>
              <strong>{groups}</strong>
              <span>Groups</span>
            </div>
          </div>
          <DashboardLink href="/admin/students">Manage students</DashboardLink>
        </div>
        <div className="executive-curriculum">
          <div>
            <p className="dashboard-eyebrow">Academic structure</p>
            <h3>Two tracks. One learning system.</h3>
          </div>
          <div className="curriculum-track">
            <span className="curriculum-track-index">A</span>
            <div>
              <strong>{academicLevels}</strong>
              <span>Active academic levels</span>
            </div>
            <DashboardLink href="/admin/academic-levels">View</DashboardLink>
          </div>
          <div className="curriculum-track">
            <span className="curriculum-track-index">B</span>
            <div>
              <strong>{levels}</strong>
              <span>Practice sub-levels</span>
            </div>
            <DashboardLink href="/admin/levels">View</DashboardLink>
          </div>
          <p className="dashboard-caption">
            Main levels are teacher controlled. Practice and exam progression
            stays separate.
          </p>
        </div>
      </section>
      {practice && (
        <AdminPracticeInsights
          practice={practice}
          canViewReports={canViewReports}
        />
      )}

      {onboarding && <AdminOnboardingChecklist steps={onboarding} />}

      {practice && (
        <DashboardSection
          eyebrow="The learning pulse"
          title="Practice, at a glance"
          description="Finished timed practice · last 7 days"
        >
          <div className="dashboard-metric-strip">
            <DashboardMetric
              label="Practice sessions"
              value={practice.totalSessions}
              detail={`${practice.passedSessions} passed attempts`}
            >
              <DashboardSparkline
                values={practice.daily.map((day) => day.sessions)}
                label="Actual daily finished practice sessions over the last seven days"
              />
            </DashboardMetric>
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
              label="Active practice days"
              value={`${practice.daily.filter((day) => day.sessions > 0).length} / 7`}
              detail="Days with a completed session"
            />
          </div>
        </DashboardSection>
      )}

      <DashboardSection
        eyebrow="Your workspace"
        title="Keep the institute moving"
        description="Go straight to the people and tools you need."
      >
        <ManagementWorkspace
          teachers={teachers}
          students={students}
          groups={groups}
          levels={levels}
          academicLevels={academicLevels}
          canViewReports={canViewReports}
        />
      </DashboardSection>

      {activity && (
        <DashboardSection
          eyebrow="Across your institute"
          title="Recent activity"
          action={
            <DashboardLink href="/admin/activity">
              Full activity log
            </DashboardLink>
          }
        >
          <div className="dashboard-panel">
            {activity.length ? (
              <ol className="dashboard-timeline">
                {activity.map((event) => (
                  <li key={event.id}>
                    <p className="text-sm font-medium leading-relaxed">
                      {event.summary}
                    </p>
                    <p className="dashboard-caption mt-1">
                      {event.actorName}
                      <span className="mx-2" aria-hidden="true">
                        ·
                      </span>
                      <time dateTime={event.createdAt}>
                        {new Date(event.createdAt).toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Dhaka",
                        })}{" "}
                        BST
                      </time>
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <DashboardNotice title="A fresh start" icon={Activity}>
                Your institute&apos;s recorded changes will appear here as your
                team gets to work.
              </DashboardNotice>
            )}
          </div>
        </DashboardSection>
      )}
    </div>
  );
}
