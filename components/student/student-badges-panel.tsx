import {
  Award,
  Flame,
  LockKeyhole,
  Medal,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type {
  StudentBadge,
  StudentGamificationStats,
} from "@/lib/student-gamification";
import {
  DashboardProgress,
  DashboardSection,
} from "@/components/dashboard/dashboard-primitives";
const BADGE_ICONS: Record<StudentBadge["id"], LucideIcon> = {
  "first-pass": Medal,
  "level-up": Trophy,
  "perfect-score": Star,
  "hot-streak": Flame,
  "weekly-warrior": Award,
};
export function StudentBadgesPanel({
  badges,
  stats,
}: {
  badges: StudentBadge[];
  stats?: StudentGamificationStats;
}) {
  const earned = badges.filter((badge) => badge.earned).length;
  const progress = stats
    ? {
        "first-pass": { current: stats.passedCount, target: 1 },
        "level-up": { current: stats.leveledUpCount, target: 1 },
        "perfect-score": { current: stats.hasPerfectScore ? 1 : 0, target: 1 },
        "hot-streak": { current: stats.streakDays, target: 3 },
        "weekly-warrior": { current: stats.sessionsLast7Days, target: 5 },
      }
    : null;
  return (
    <DashboardSection
      eyebrow="Effort worth celebrating"
      title="Your achievement collection"
      description={`${earned} of ${badges.length} earned. Real milestones, at your own pace.`}
    >
      <ul className="student-badge-grid">
        {badges.map((badge) => {
          const Icon = BADGE_ICONS[badge.id];
          const goal = progress?.[badge.id];
          return (
            <li
              key={badge.id}
              className="student-badge"
              data-earned={badge.earned}
            >
              <span className="student-badge-medal">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3>{badge.label}</h3>
              <details>
                <summary>
                  {badge.earned ? "View achievement" : "How to earn"}
                </summary>
                <p className="dashboard-caption">{badge.description}</p>
              </details>
              <p className="my-3 flex items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground">
                {!badge.earned && (
                  <LockKeyhole className="size-3" aria-hidden="true" />
                )}
                {badge.earned ? "Earned" : "Not earned yet"}
              </p>
              {goal && (
                <DashboardProgress
                  value={
                    (Math.min(goal.target, goal.current) / goal.target) * 100
                  }
                  label={`${badge.label}: ${Math.min(goal.target, goal.current)} of ${goal.target}`}
                />
              )}
            </li>
          );
        })}
      </ul>
    </DashboardSection>
  );
}
