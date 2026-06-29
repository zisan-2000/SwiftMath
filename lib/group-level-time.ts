// Per-group level time overrides — pure helpers for tests and server code.

/** Resolve the timed practice limit for a student in seconds. */
export function resolveTimeLimitSeconds(
  levelDefaultSeconds: number,
  groupOverrideSeconds: number | null | undefined,
): number {
  if (
    groupOverrideSeconds != null &&
    Number.isFinite(groupOverrideSeconds) &&
    groupOverrideSeconds > 0
  ) {
    return groupOverrideSeconds;
  }
  return levelDefaultSeconds;
}

/** Validate a teacher-entered group time override. */
export function validateGroupTimeLimitSeconds(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds < 1) {
    return "Time limit must be at least 1 second.";
  }
  if (seconds > 3600) {
    return "Time limit must be 3600 seconds (1 hour) or less.";
  }
  return null;
}

/** Parse a time-limit field from a form; null means use the level default. */
export function parseGroupTimeLimitField(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const seconds = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(seconds)) return null;
  return seconds;
}
