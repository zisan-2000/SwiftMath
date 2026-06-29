// Trusted level-access checks — combines DB lookups with pure prerequisite rules.

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  canAccessLevel,
  levelUnlockMessage,
} from "@/lib/level-prerequisites";
import { ACTIVE_LEVEL_FILTER } from "@/lib/active-levels";

/** Thrown when a student tries to practise or be assigned a locked level. */
export class LevelAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LevelAccessError";
  }
}

/**
 * Check whether a student may access a level (practice start or assignment).
 * Returns `{ allowed, message }` where message is null when allowed.
 */
export async function checkStudentLevelAccess(
  studentId: string,
  instituteId: string,
  levelId: string,
): Promise<{ allowed: boolean; message: string | null }> {
  const level = await prisma.level.findFirst({
    where: { id: levelId, instituteId },
    select: {
      orderIndex: true,
      requiresPreviousPass: true,
      archivedAt: true,
    },
  });
  if (!level) {
    return { allowed: false, message: "Level not found." };
  }
  if (level.archivedAt) {
    return {
      allowed: false,
      message:
        "This level has been archived. Ask your teacher or admin to assign a new level.",
    };
  }

  const previous =
    level.orderIndex > 1
      ? await prisma.level.findFirst({
          where: {
            instituteId,
            orderIndex: level.orderIndex - 1,
            ...ACTIVE_LEVEL_FILTER,
          },
          select: { id: true, name: true },
        })
      : null;

  let studentPassedPrevious = true;
  if (previous) {
    const passed = await prisma.practiceSession.findFirst({
      where: { studentId, levelId: previous.id, passed: true },
      select: { id: true },
    });
    studentPassedPrevious = passed != null;
  }

  const ctx = {
    orderIndex: level.orderIndex,
    requiresPreviousPass: level.requiresPreviousPass,
    previousLevelName: previous?.name ?? null,
    studentPassedPrevious,
  };

  return {
    allowed: canAccessLevel(ctx),
    message: levelUnlockMessage(ctx),
  };
}

/** Like `checkStudentLevelAccess`, but throws `LevelAccessError` when blocked. */
export async function assertStudentLevelAccess(
  studentId: string,
  instituteId: string,
  levelId: string,
): Promise<void> {
  const { allowed, message } = await checkStudentLevelAccess(
    studentId,
    instituteId,
    levelId,
  );
  if (!allowed) {
    throw new LevelAccessError(message ?? "This level is locked.");
  }
}
