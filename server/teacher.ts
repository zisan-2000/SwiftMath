// Trusted, server-only logic for the teacher flow.
//
// Every function takes the authenticated teacher's identity and enforces
// scoping itself — a teacher can only ever touch their own groups, the students
// in those groups, and levels belonging to their own institute. The callers
// (server actions) handle auth (requireRole) and user-facing validation; the
// ownership checks here are the trusted backstop.

import "server-only";

import { prisma } from "@/lib/prisma";
import { createUserAccount } from "@/server/users";
import { Role } from "@/lib/generated/prisma/enums";

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
    select: { id: true, name: true, orderIndex: true },
  });
}

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

/**
 * Set (or clear) a student's current level. Verifies the student is in one of
 * the teacher's groups and the level belongs to the teacher's institute.
 * Pass `null` to unassign.
 */
export async function assignStudentLevel(
  teacher: TeacherContext,
  studentId: string,
  levelId: string | null,
) {
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
      throw new Error("Level not found in this institute.");
    }
  }

  return prisma.user.update({
    where: { id: studentId },
    data: { currentLevelId: levelId },
  });
}
