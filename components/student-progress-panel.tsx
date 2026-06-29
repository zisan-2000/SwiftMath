import { PartyPopper, RotateCcw, Timer } from "lucide-react";

import { SessionStatus } from "@/lib/generated/prisma/enums";
import {
  formatSpeedDuration,
  sessionDurationMs,
} from "@/lib/practice-speed";
import type { StudentProgressData } from "@/server/student-progress";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

type StudentProgressPanelProps = {
  progress: StudentProgressData;
};

/** Read-only stats, speed breakdown, and recent attempts for a student. */
export function StudentProgressPanel({ progress }: StudentProgressPanelProps) {
  const { student, recentSessions, stats } = progress;
  const currentSpeed = stats.speedAtCurrentLevel ?? stats.speedAll;

  return (
    <>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard
          label="Current level"
          value={
            student.currentLevel
              ? `${student.currentLevel.orderIndex}. ${student.currentLevel.name}`
              : "Not assigned"
          }
        />
        <StatCard label="Attempts" value={stats.completed} hint="Finished" />
        <StatCard label="Passed" value={stats.passedCount} />
        <StatCard
          label="Retries"
          value={
            stats.retryCount.atCurrentLevel ?? stats.retryCount.total
          }
          hint={stats.retryCount.hint}
          icon={RotateCcw}
        />
        <StatCard
          label="Fastest pass"
          value={formatSpeedDuration(currentSpeed.fastestPassMs)}
          hint={
            student.currentLevel ? "At current level" : "Across all levels"
          }
          icon={Timer}
        />
        <StatCard
          label="Avg pass time"
          value={formatSpeedDuration(currentSpeed.avgPassMs)}
          hint="Among passed attempts"
          icon={Timer}
        />
        <StatCard label="Avg. accuracy" value={`${stats.avgAccuracy}%`} />
        <StatCard label="Best accuracy" value={`${stats.bestAccuracy}%`} />
      </div>

      {stats.leveledUpCount > 0 && (
        <Card className="mb-8 border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-foreground">
            <PartyPopper className="h-5 w-5 shrink-0 text-primary" />
            <span>
              Leveled up {stats.leveledUpCount}{" "}
              {stats.leveledUpCount === 1 ? "time" : "times"} so far.
            </span>
          </CardContent>
        </Card>
      )}

      {stats.levelSpeedRows.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Speed by level
          </h2>
          <Card className="mb-8">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                      <th className="px-5 py-2.5 font-medium">Level</th>
                      <th className="px-5 py-2.5 font-medium">Passes</th>
                      <th className="px-5 py-2.5 font-medium">Fastest pass</th>
                      <th className="px-5 py-2.5 font-medium">Avg pass time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.levelSpeedRows.map((row) => (
                      <tr
                        key={row.levelId}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-5 py-3 align-middle font-medium text-foreground">
                          {row.orderIndex}. {row.levelName}
                        </td>
                        <td className="px-5 py-3 align-middle tabular-nums">
                          {row.passCount}
                        </td>
                        <td className="px-5 py-3 align-middle tabular-nums">
                          {formatSpeedDuration(row.fastestPassMs)}
                        </td>
                        <td className="px-5 py-3 align-middle tabular-nums">
                          {formatSpeedDuration(row.avgPassMs)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Recent attempts
      </h2>
      {recentSessions.length === 0 ? (
        <EmptyState
          title="No attempts yet"
          description="This student hasn’t practised yet."
        />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {recentSessions.map((s) => {
              const durationMs =
                s.status === SessionStatus.IN_PROGRESS
                  ? null
                  : sessionDurationMs({
                      startedAt: s.startedAt,
                      submittedAt: s.submittedAt,
                      passed: s.passed,
                    });

              return (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{s.level.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.createdAt.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:text-right">
                    {s.status === SessionStatus.IN_PROGRESS ? (
                      <Badge variant="warning">In progress</Badge>
                    ) : (
                      <>
                        {durationMs != null && (
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {formatSpeedDuration(durationMs)}
                          </span>
                        )}
                        <span className="font-semibold tabular-nums text-foreground">
                          {s.accuracy}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({s.correctCount}/{s.totalQuestions})
                        </span>
                        <Badge variant={s.passed ? "success" : "muted"}>
                          {s.passed ? "Passed" : "Not passed"}
                        </Badge>
                        {s.status === SessionStatus.EXPIRED && (
                          <Badge variant="warning">Expired</Badge>
                        )}
                        {s.leveledUp && <Badge>Leveled up</Badge>}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
