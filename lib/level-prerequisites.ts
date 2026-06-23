// Level prerequisite rules — pure logic for “must pass previous level”.
// Kept framework-agnostic for unit tests.

/** Inputs needed to decide if a student may access a level. */
export interface LevelUnlockCheck {
  orderIndex: number;
  requiresPreviousPass: boolean;
  /** Name of the immediately previous level, if any. */
  previousLevelName: string | null;
  /** Whether the student has at least one passed attempt at the previous level. */
  studentPassedPrevious: boolean;
}

/** True when the student may practise or be assigned this level. */
export function canAccessLevel(ctx: LevelUnlockCheck): boolean {
  if (!ctx.requiresPreviousPass) return true;
  if (ctx.orderIndex <= 1) return true;
  if (!ctx.previousLevelName) return true;
  return ctx.studentPassedPrevious;
}

/** User-facing reason when access is blocked, or null when allowed. */
export function levelUnlockMessage(ctx: LevelUnlockCheck): string | null {
  if (canAccessLevel(ctx)) return null;
  return `Pass “${ctx.previousLevelName}” before starting this level.`;
}
