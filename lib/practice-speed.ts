// Finish-time helpers for teacher speed analytics (server-computed).

export interface TimedSessionRow {
  startedAt: Date;
  submittedAt: Date | null;
  passed: boolean;
}

/** Elapsed ms for a submitted session, or null when not timed out yet. */
export function sessionDurationMs(session: TimedSessionRow): number | null {
  if (!session.submittedAt) return null;
  const ms = session.submittedAt.getTime() - session.startedAt.getTime();
  return ms >= 0 ? ms : null;
}

export interface SpeedSummary {
  /** Finished attempts with a recorded submit time. */
  timedCount: number;
  /** Passed attempts with a recorded submit time. */
  passedCount: number;
  /** Mean finish time across all timed attempts. */
  avgFinishMs: number | null;
  /** Mean finish time among passed attempts only. */
  avgPassMs: number | null;
  /** Shortest finish among passed attempts. */
  fastestPassMs: number | null;
}

function averageDuration(durations: number[]): number | null {
  if (durations.length === 0) return null;
  return Math.round(
    durations.reduce((sum, value) => sum + value, 0) / durations.length,
  );
}

/** Aggregate finish-time stats from timed practice sessions. */
export function buildSpeedSummary(sessions: TimedSessionRow[]): SpeedSummary {
  const allDurations = sessions
    .map(sessionDurationMs)
    .filter((value): value is number => value != null);
  const passDurations = sessions
    .filter((session) => session.passed)
    .map(sessionDurationMs)
    .filter((value): value is number => value != null);

  return {
    timedCount: allDurations.length,
    passedCount: passDurations.length,
    avgFinishMs: averageDuration(allDurations),
    avgPassMs: averageDuration(passDurations),
    fastestPassMs:
      passDurations.length > 0 ? Math.min(...passDurations) : null,
  };
}

export interface LevelSpeedRow {
  levelId: string;
  levelName: string;
  orderIndex: number;
  attemptCount: number;
  passCount: number;
  avgPassMs: number | null;
  fastestPassMs: number | null;
}

type LevelSpeedSession = TimedSessionRow & {
  levelId: string;
  levelName: string;
  orderIndex: number;
};

/** Per-level speed breakdown for one student (sorted by curriculum order). */
export function buildLevelSpeedRows(
  sessions: LevelSpeedSession[],
): LevelSpeedRow[] {
  const byLevel = new Map<
    string,
    { levelName: string; orderIndex: number; sessions: TimedSessionRow[] }
  >();

  for (const session of sessions) {
    const bucket = byLevel.get(session.levelId) ?? {
      levelName: session.levelName,
      orderIndex: session.orderIndex,
      sessions: [],
    };
    bucket.sessions.push(session);
    byLevel.set(session.levelId, bucket);
  }

  return [...byLevel.entries()]
    .map(([levelId, bucket]) => {
      const summary = buildSpeedSummary(bucket.sessions);
      return {
        levelId,
        levelName: bucket.levelName,
        orderIndex: bucket.orderIndex,
        attemptCount: summary.timedCount,
        passCount: summary.passedCount,
        avgPassMs: summary.avgPassMs,
        fastestPassMs: summary.fastestPassMs,
      };
    })
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

/** Format a speed stat for display, or an em dash when unknown. */
export function formatSpeedDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
