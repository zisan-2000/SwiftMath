import { Check, Flag, Layers, Sparkles, Star } from "lucide-react";
import type { StudentGamificationSummary } from "@/server/student-gamification";
import type { DailySessionCount } from "@/lib/analytics";
import { DashboardLink, DashboardProgress } from "./dashboard-primitives";

/** Decorative abacus, not a visualization of a score or invented progress. */
export function AbacusIllustration() {
  return (
    <svg
      className="student-abacus-art"
      viewBox="0 0 280 210"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m53 165 135 20 60-49-133-17z"
        fill="currentColor"
        opacity=".08"
      />
      <g transform="translate(42 16) rotate(9 100 85)">
        <rect
          x="12"
          y="20"
          width="190"
          height="140"
          rx="18"
          fill="var(--card)"
          stroke="currentColor"
          strokeWidth="3"
        />
        <rect
          x="25"
          y="34"
          width="164"
          height="111"
          rx="8"
          fill="var(--primary)"
          opacity=".07"
        />
        {[48, 87, 126, 165].map((x, i) => (
          <g key={x}>
            <path
              d={`M${x} 39v101`}
              stroke="currentColor"
              opacity=".35"
              strokeWidth="3"
            />
            <rect
              x={x - 12}
              y={i % 2 ? 45 : 58}
              width="24"
              height="15"
              rx="7.5"
              fill={i % 2 ? "var(--primary)" : "#d5ac66"}
            />
            {[0, 1, 2].map((j) => (
              <rect
                key={j}
                x={x - 12}
                y={82 + j * 18}
                width="24"
                height="14"
                rx="7"
                fill="var(--primary)"
                opacity={0.9 - j * 0.15}
              />
            ))}
          </g>
        ))}
        <path d="M25 78h164" stroke="currentColor" strokeWidth="4" />
      </g>
      <path
        d="m218 36 5 9 10 2-7 7 1 10-9-4-9 4 2-10-7-7 10-2z"
        fill="#d5ac66"
      />
      <path
        d="M20 112v14m-7-7h14M236 154v10m-5-5h10"
        stroke="currentColor"
        strokeWidth="2"
        opacity=".6"
      />
      <circle cx="36" cy="48" r="4" stroke="currentColor" opacity=".5" />
      <path
        d="M220 86q31 12 12 42"
        stroke="currentColor"
        strokeDasharray="3 5"
        opacity=".4"
      />
    </svg>
  );
}

export function LearningJourney({
  currentLevel,
  stats,
}: {
  currentLevel: string | null;
  stats: StudentGamificationSummary;
}) {
  const goal = stats.badges.find((badge) => !badge.earned);
  const milestones = [
    {
      label: stats.passedCount ? "First pass, earned" : "Your first pass",
      detail: stats.passedCount
        ? `${stats.passedCount} timed practices passed so far`
        : "Pass a timed practice to begin",
      state: stats.passedCount ? "earned" : "waiting",
      Icon: stats.passedCount ? Check : Flag,
    },
    {
      label: currentLevel ?? "No sub-level assigned yet",
      detail: currentLevel
        ? "Current practice / exam sub-level"
        : "Your teacher chooses your starting point",
      state: currentLevel ? "current" : "waiting",
      Icon: Layers,
    },
    {
      label: goal ? `Next: ${goal.label}` : "Your collection is complete",
      detail: goal?.description ?? "All current achievement badges earned",
      state: goal ? "next" : "earned",
      Icon: goal ? Flag : Star,
    },
  ];
  return (
    <section className="learning-map" aria-labelledby="learning-path-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="dashboard-eyebrow">Your progress, mapped</p>
          <h2 id="learning-path-title">Your learning path</h2>
        </div>
        <DashboardLink href="/student/practice">Practice space</DashboardLink>
      </div>
      <div className="milestone-map">
        <svg viewBox="0 0 600 90" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M60 45C160-16 215 108 300 45S445-16 540 45"
            fill="none"
            stroke="var(--border)"
            strokeWidth="2"
            strokeDasharray="5 7"
          />
        </svg>
        <ol>
          {milestones.map(({ label, detail, state, Icon }, index) => (
            <li key={index} data-state={state}>
              <span className="milestone-marker">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <small>
                {index === 0
                  ? "Milestone"
                  : index === 1
                    ? "You are here"
                    : "Next goal"}
              </small>
              <h3>{label}</h3>
              <p>{detail}</p>
            </li>
          ))}
        </ol>
      </div>
      <div className="learning-map-note">
        <Sparkles className="size-4 shrink-0" aria-hidden="true" />
        <p>
          {stats.leveledUpCount > 0
            ? `${stats.leveledUpCount} practice advances recorded. `
            : ""}
          Academic level changes are always set by your teacher. Practice and
          exam progress stay separate from class marks.
        </p>
      </div>
    </section>
  );
}

export function WeeklyPracticeBeads({
  stats,
  days,
}: {
  stats: StudentGamificationSummary;
  days: DailySessionCount[];
}) {
  const complete = Math.min(5, stats.sessionsLast7Days);
  return (
    <section className="practice-rhythm" aria-label="Weekly practice goal">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="dashboard-eyebrow">Your weekly rhythm</p>
          <h2>Five days. One good habit.</h2>
        </div>
        <span className="rhythm-count">
          {stats.sessionsLast7Days}
          <small>/ 5 days</small>
        </span>
      </div>
      <p className="dashboard-description">
        {complete === 5
          ? "Weekly warrior earned. Keep your rhythm."
          : `${5 - complete} more practice ${5 - complete === 1 ? "day" : "days"} to your Weekly warrior badge.`}
      </p>
      <div
        className="practice-bead-rail"
        role="img"
        aria-label={`Weekly warrior practice-day goal: ${complete} of 5 days`}
      >
        <span aria-hidden="true" />
        {Array.from({ length: 5 }, (_, i) => (
          <i key={i} data-filled={i < complete} aria-hidden="true">
            {i < complete ? <Check className="size-4" /> : i + 1}
          </i>
        ))}
      </div>
      <div
        className="practice-week-days"
        aria-label="Your last seven days of timed practice"
      >
        {days.map((day) => (
          <div
            key={day.date}
            data-active={day.sessions > 0}
            title={`${day.date}: ${day.sessions} finished timed attempts`}
          >
            <span>{day.label}</span>
            <strong>{day.sessions || "·"}</strong>
            <span className="sr-only">
              {day.date}, {day.sessions} finished timed attempts
            </span>
          </div>
        ))}
      </div>
      <DashboardProgress
        value={(complete / 5) * 100}
        label="Weekly practice-day progress"
      />
      <p className="dashboard-caption mt-3">
        Each bead is one distinct practice day. Counts below show finished
        attempts.
      </p>
    </section>
  );
}
