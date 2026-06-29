// Trusted, server-only logic for the teacher flow.
//
// Every function takes the authenticated teacher's identity and enforces
// scoping itself — a teacher can only ever touch their own groups, the students
// in those groups, and levels belonging to their own institute. The callers
// (server actions) handle auth (requireRole) and user-facing validation; the
// ownership checks here are the trusted backstop.

import "server-only";

import { prisma } from "@/lib/prisma";
import { createUserAccount, setUserPassword } from "@/server/users";
import { checkStudentLevelAccess } from "@/server/level-access";
import {
  parseGroupTimeLimitField,
  resolveTimeLimitSeconds,
  validateGroupTimeLimitSeconds,
} from "@/lib/group-level-time";
import { Role, SessionStatus } from "@/lib/generated/prisma/enums";

/** The authenticated teacher, as needed for scoping. */
export interface TeacherContext {
  id: string;
  instituteId: string;
}

/** Groups owned by this teacher, with how many students are in each. */
export function listTeacherGroups(teacherId: string) {
  return prisma.group.findMany({
    where: { teacherId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { students: true } },
    },
  });
}

/** Create a new group owned by this teacher, in their institute. */
export function createGroup(teacher: TeacherContext, name: string) {
  return prisma.group.create({
    data: {
      name: name.trim(),
      teacherId: teacher.id,
      instituteId: teacher.instituteId,
    },
  });
}

/**
 * A single group owned by the teacher, with its students and each student's
 * current level. Returns null if the group does not exist or isn't theirs.
 */
export function getTeacherGroup(teacher: TeacherContext, groupId: string) {
  return prisma.group.findFirst({
    where: { id: groupId, teacherId: teacher.id },
    select: {
      id: true,
      name: true,
      students: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          currentLevelId: true,
          currentLevel: { select: { name: true } },
        },
      },
    },
  });
}

/** All levels for an institute, in progression order (for assignment menus). */
export function listInstituteLevels(instituteId: string) {
  return prisma.level.findMany({
    where: { instituteId },
    orderBy: { orderIndex: "asc" },
    select: { id: true, name: true, orderIndex: true, timeLimitSeconds: true },
  });
}

export interface GroupLevelTimeRuleRow {
  levelId: string;
  name: string;
  orderIndex: number;
  defaultSeconds: number;
  overrideSeconds: number | null;
  effectiveSeconds: number;
}

/** Levels plus any per-group time overrides owned by this teacher's group. */
export async function listGroupLevelTimeRules(
  teacher: TeacherContext,
  groupId: string,
): Promise<GroupLevelTimeRuleRow[] | null> {
  const group = await prisma.group.findFirst({
    where: { id: groupId, teacherId: teacher.id },
    select: { id: true },
  });
  if (!group) return null;

  const [levels, rules] = await Promise.all([
    listInstituteLevels(teacher.instituteId),
    prisma.groupLevelRule.findMany({
      where: { groupId },
      select: { levelId: true, timeLimitSeconds: true },
    }),
  ]);

  const overrideByLevel = new Map(
    rules.map((rule) => [rule.levelId, rule.timeLimitSeconds]),
  );

  return levels.map((level) => {
    const overrideSeconds = overrideByLevel.get(level.id) ?? null;
    return {
      levelId: level.id,
      name: level.name,
      orderIndex: level.orderIndex,
      defaultSeconds: level.timeLimitSeconds,
      overrideSeconds,
      effectiveSeconds: resolveTimeLimitSeconds(
        level.timeLimitSeconds,
        overrideSeconds,
      ),
    };
  });
}

export type SetGroupLevelTimeResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Set or clear a per-group time override for a level. Empty/`null` seconds
 * removes the override so the institute default applies.
 */
export async function setGroupLevelTimeRule(
  teacher: TeacherContext,
  groupId: string,
  levelId: string,
  timeLimitSeconds: number | null,
): Promise<SetGroupLevelTimeResult> {
  const group = await prisma.group.findFirst({
    where: { id: groupId, teacherId: teacher.id },
    select: { id: true, instituteId: true },
  });
  if (!group) {
    return { ok: false, error: "Group not found." };
  }

  const level = await prisma.level.findFirst({
    where: { id: levelId, instituteId: group.instituteId },
    select: { id: true },
  });
  if (!level) {
    return { ok: false, error: "Level not found in this institute." };
  }

  if (timeLimitSeconds == null) {
    await prisma.groupLevelRule.deleteMany({
      where: { groupId, levelId },
    });
    return { ok: true };
  }

  const validationError = validateGroupTimeLimitSeconds(timeLimitSeconds);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  await prisma.groupLevelRule.upsert({
    where: { groupId_levelId: { groupId, levelId } },
    create: { groupId, levelId, timeLimitSeconds },
    update: { timeLimitSeconds },
  });

  return { ok: true };
}

/** Effective timed limit for a student, honouring their group's override. */
export async function resolveStudentPracticeTimeLimit(
  studentId: string,
  levelId: string,
  levelDefaultSeconds: number,
): Promise<number> {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { groupId: true },
  });
  if (!student?.groupId) {
    return levelDefaultSeconds;
  }

  const rule = await prisma.groupLevelRule.findUnique({
    where: {
      groupId_levelId: { groupId: student.groupId, levelId },
    },
    select: { timeLimitSeconds: true },
  });

  return resolveTimeLimitSeconds(levelDefaultSeconds, rule?.timeLimitSeconds);
}

export { parseGroupTimeLimitField };

/**
 * Create a STUDENT account and place them in one of the teacher's groups.
 * Throws if the group isn't the teacher's. Email-uniqueness errors bubble up
 * from createUserAccount for the action to translate.
 */
export async function addStudentToGroup(
  teacher: TeacherContext,
  groupId: string,
  student: { name: string; email: string; password: string },
) {
  const group = await prisma.group.findFirst({
    where: { id: groupId, teacherId: teacher.id },
    select: { id: true },
  });
  if (!group) {
    throw new Error("Group not found or not owned by this teacher.");
  }

  return createUserAccount({
    name: student.name,
    email: student.email,
    password: student.password,
    role: Role.STUDENT,
    instituteId: teacher.instituteId,
    groupId: group.id,
  });
}

export type AssignLevelResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Set (or clear) a student's current level. Verifies the student is in one of
 * the teacher's groups and the level belongs to the teacher's institute.
 * Pass `null` to unassign. Enforces level prerequisites when configured.
 */
export async function assignStudentLevel(
  teacher: TeacherContext,
  studentId: string,
  levelId: string | null,
): Promise<AssignLevelResult> {
  // Student must be a STUDENT inside a group this teacher owns.
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: Role.STUDENT,
      group: { teacherId: teacher.id },
    },
    select: { id: true },
  });
  if (!student) {
    throw new Error("Student not found in this teacher's groups.");
  }

  if (levelId) {
    const level = await prisma.level.findFirst({
      where: { id: levelId, instituteId: teacher.instituteId },
      select: { id: true },
    });
    if (!level) {
      return { ok: false, error: "Level not found in this institute." };
    }

    const access = await checkStudentLevelAccess(
      studentId,
      teacher.instituteId,
      levelId,
    );
    if (!access.allowed) {
      return { ok: false, error: access.message ?? "This level is locked." };
    }
  }

  await prisma.user.update({
    where: { id: studentId },
    data: { currentLevelId: levelId },
  });
  return { ok: true };
}

/**
 * A student's practice progress, for a teacher to review. Verifies the student
 * is in the given group and that the group belongs to this teacher (returns
 * null otherwise). Aggregates are computed from server-written session data, so
 * they can't be influenced by the browser.
 */
export async function getStudentProgress(
  teacher: TeacherContext,
  groupId: string,
  studentId: string,
) {
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: Role.STUDENT,
      groupId,
      group: { teacherId: teacher.id },
    },
    select: {
      id: true,
      name: true,
      email: true,
      currentLevel: { select: { name: true, orderIndex: true } },
    },
  });
  if (!student) return null;

  const [recentSessions, finishedStats, passedCount, leveledUpCount] =
    await Promise.all([
      // Most recent attempts (any status).
      prisma.practiceSession.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          accuracy: true,
          correctCount: true,
          totalQuestions: true,
          passed: true,
          leveledUp: true,
          createdAt: true,
          level: { select: { name: true } },
        },
      }),
      // Accuracy aggregates over finished (graded) attempts only.
      prisma.practiceSession.aggregate({
        where: { studentId, status: { not: SessionStatus.IN_PROGRESS } },
        _avg: { accuracy: true },
        _max: { accuracy: true },
        _count: { _all: true },
      }),
      prisma.practiceSession.count({ where: { studentId, passed: true } }),
      prisma.practiceSession.count({ where: { studentId, leveledUp: true } }),
    ]);

  return {
    student,
    recentSessions,
    stats: {
      completed: finishedStats._count._all,
      avgAccuracy: Math.round(finishedStats._avg.accuracy ?? 0),
      bestAccuracy: finishedStats._max.accuracy ?? 0,
      passedCount,
      leveledUpCount,
    },
  };
}

/**
 * Move a student from one of the teacher's groups into another group the same
 * teacher owns. Both the student's current group and the target group must
 * belong to this teacher (a teacher can't pull in or push out students from
 * another teacher's class). The student's level is left untouched. Returns
 * false if the move isn't allowed.
 */
export async function moveStudentToGroup(
  teacher: TeacherContext,
  studentId: string,
  targetGroupId: string,
): Promise<boolean> {
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: Role.STUDENT,
      group: { teacherId: teacher.id },
    },
    select: { id: true },
  });
  if (!student) return false;

  const target = await prisma.group.findFirst({
    where: { id: targetGroupId, teacherId: teacher.id },
    select: { id: true },
  });
  if (!target) return false;

  await prisma.user.update({
    where: { id: studentId },
    data: { groupId: targetGroupId },
  });
  return true;
}

/**
 * Reset a student's password. Verifies the student belongs to one of this
 * teacher's groups before delegating to setUserPassword. Returns false if the
 * student isn't in the teacher's groups.
 */
export async function resetStudentPassword(
  teacher: TeacherContext,
  studentId: string,
  newPassword: string,
): Promise<boolean> {
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: Role.STUDENT,
      group: { teacherId: teacher.id },
    },
    select: { id: true },
  });
  if (!student) return false;

  await setUserPassword(studentId, newPassword);
  return true;
}

export type DeleteGroupResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "not-empty" };

/**
 * Delete a group owned by this teacher. Only allowed when the group has no
 * students — move students to another group first.
 */
export async function deleteGroup(
  teacher: TeacherContext,
  groupId: string,
): Promise<DeleteGroupResult> {
  const group = await prisma.group.findFirst({
    where: { id: groupId, teacherId: teacher.id },
    select: { id: true, _count: { select: { students: true } } },
  });
  if (!group) return { ok: false, reason: "not-found" };
  if (group._count.students > 0) return { ok: false, reason: "not-empty" };

  await prisma.group.delete({ where: { id: group.id } });
  return { ok: true };
}
