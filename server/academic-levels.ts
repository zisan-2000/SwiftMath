import "server-only";

import { AuditAction, Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export class AcademicLevelError extends Error {}

export interface AcademicActor {
  id: string;
  instituteId: string;
  role: Role;
}

export function listAcademicLevels(instituteId: string, includeInactive = false) {
  return prisma.academicLevel.findMany({
    where: { instituteId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: [{ orderIndex: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      orderIndex: true,
      isActive: true,
      _count: { select: { students: true } },
    },
  });
}

export function getTeacherStudentAcademicLevel(actor: AcademicActor, groupId: string, studentId: string) {
  return prisma.user.findFirst({
    where: {
      id: studentId,
      groupId,
      instituteId: actor.instituteId,
      role: Role.STUDENT,
      group: { teacherId: actor.id },
    },
    select: { academicLevelId: true, academicLevel: { select: { name: true } } },
  });
}

export function getAdminStudentAcademicLevel(actor: AcademicActor, studentId: string) {
  return prisma.user.findFirst({
    where: { id: studentId, instituteId: actor.instituteId, role: Role.STUDENT },
    select: { academicLevelId: true, academicLevel: { select: { name: true } } },
  });
}

export async function createAcademicLevel(
  actor: AcademicActor,
  input: { name: string; orderIndex: number },
) {
  const name = input.name.trim();
  if (!name) throw new AcademicLevelError("Academic level name is required.");
  if (!Number.isInteger(input.orderIndex) || input.orderIndex < 1) {
    throw new AcademicLevelError("Order must be a positive whole number.");
  }

  return prisma.$transaction(async (tx) => {
    const level = await tx.academicLevel.create({
      data: { instituteId: actor.instituteId, name, orderIndex: input.orderIndex },
    });
    await tx.auditLog.create({
      data: {
        instituteId: actor.instituteId,
        actorUserId: actor.id,
        actorRole: actor.role,
        action: AuditAction.ACADEMIC_LEVEL_CREATED,
        targetType: "AcademicLevel",
        targetId: level.id,
        summary: `Created academic level ${name}.`,
        metadata: { name, orderIndex: input.orderIndex },
      },
    });
    return level;
  });
}

export async function updateAcademicLevel(
  actor: AcademicActor,
  levelId: string,
  input: { name: string; orderIndex: number; isActive: boolean },
) {
  const name = input.name.trim();
  if (!name) throw new AcademicLevelError("Academic level name is required.");
  if (!Number.isInteger(input.orderIndex) || input.orderIndex < 1) {
    throw new AcademicLevelError("Order must be a positive whole number.");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.academicLevel.findFirst({
      where: { id: levelId, instituteId: actor.instituteId },
      select: { id: true },
    });
    if (!existing) throw new AcademicLevelError("Academic level not found.");
    const level = await tx.academicLevel.update({
      where: { id: levelId },
      data: { name, orderIndex: input.orderIndex, isActive: input.isActive },
    });
    await tx.auditLog.create({
      data: {
        instituteId: actor.instituteId,
        actorUserId: actor.id,
        actorRole: actor.role,
        action: AuditAction.ACADEMIC_LEVEL_UPDATED,
        targetType: "AcademicLevel",
        targetId: level.id,
        summary: `Updated academic level ${name}.`,
        metadata: { name, orderIndex: input.orderIndex, isActive: input.isActive },
      },
    });
    return level;
  });
}

/** Assign or clear a main academic level. Teacher access is restricted to an owned group. */
export async function assignStudentAcademicLevel(
  actor: AcademicActor,
  studentId: string,
  academicLevelId: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const student = await tx.user.findFirst({
      where: {
        id: studentId,
        instituteId: actor.instituteId,
        role: Role.STUDENT,
        ...(actor.role === Role.TEACHER
          ? { group: { teacherId: actor.id } }
          : actor.role === Role.ADMIN
            ? {}
            : { id: "__forbidden__" }),
      },
      select: {
        id: true,
        name: true,
        academicLevelId: true,
        academicLevel: { select: { name: true } },
      },
    });
    if (!student) throw new AcademicLevelError("Student not found or not managed by you.");

    const nextLevel = academicLevelId
      ? await tx.academicLevel.findFirst({
          where: { id: academicLevelId, instituteId: actor.instituteId, isActive: true },
          select: { id: true, name: true },
        })
      : null;
    if (academicLevelId && !nextLevel) {
      throw new AcademicLevelError("Choose an active academic level from your institute.");
    }

    if (student.academicLevelId === (nextLevel?.id ?? null)) return;

    await tx.user.update({
      where: { id: student.id },
      data: { academicLevelId: nextLevel?.id ?? null },
    });
    await tx.auditLog.create({
      data: {
        instituteId: actor.instituteId,
        actorUserId: actor.id,
        actorRole: actor.role,
        action: AuditAction.STUDENT_ACADEMIC_LEVEL_CHANGED,
        targetType: "User",
        targetId: student.id,
        summary: `Changed ${student.name}'s academic level from ${student.academicLevel?.name ?? "Unassigned"} to ${nextLevel?.name ?? "Unassigned"}.`,
        metadata: {
          studentId: student.id,
          previousAcademicLevelId: student.academicLevelId,
          newAcademicLevelId: nextLevel?.id ?? null,
        },
      },
    });
  });
}
