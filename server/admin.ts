// Trusted, server-only logic for the ADMIN flow.
//
// Phase 1 collapses Super Admin + Institute Admin into one ADMIN who manages a
// SINGLE institute — their own. Every function takes the admin's identity and
// scopes by their `instituteId`, so an admin can never read or write another
// institute's data. Callers (server actions) handle auth (requireRole) and
// user-facing validation; the scoping here is the trusted backstop.

import "server-only";

import { prisma } from "@/lib/prisma";
import { createUserAccount, setUserPassword } from "@/server/users";
import { checkStudentLevelAccess } from "@/server/level-access";
import { Role, OperationType } from "@/lib/generated/prisma/enums";
import {
  buildPaginatedList,
  DEFAULT_PAGE_SIZE,
  paginationBounds,
  type PaginatedList,
} from "@/lib/pagination";
import type { InstituteBrandingSettings } from "@/lib/institute-branding";

/** The authenticated admin, as needed for scoping. */
export interface AdminContext {
  id: string;
  instituteId: string;
}

/**
 * The full set of trusted, server-enforced fields that define a practice level.
 * These drive question generation, timing, and pass/level-up — the browser
 * never sets them, so the action validates and the admin supplies them here.
 */
export interface LevelInput {
  name: string;
  orderIndex: number;
  operation: OperationType;
  termsPerQuestion: number;
  minNumber: number;
  maxNumber: number;
  questionCount: number;
  timeLimitSeconds: number;
  passAccuracy: number;
  requiresPreviousPass: boolean;
}

/**
 * Every teacher in the admin's institute, with how many groups each owns.
 * Ordered by name for a stable list. Paginated for large institutes.
 */
export async function listInstituteTeachers(
  instituteId: string,
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<PaginatedList<{
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  _count: { taughtGroups: number };
}>> {
  const { skip, take, page: safePage, pageSize: safeSize } = paginationBounds(
    page,
    pageSize,
  );
  const where = { instituteId, role: Role.TEACHER };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        _count: { select: { taughtGroups: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return buildPaginatedList(items, total, safePage, safeSize);
}

/**
 * Create a TEACHER account in the admin's institute. Delegates to the single
 * trusted user-provisioning helper, which sets role/instituteId server-side and
 * writes the matching credential row so the teacher can sign in immediately.
 *
 * Email-uniqueness errors bubble up from createUserAccount for the action to
 * translate into a friendly message.
 */
export function createTeacher(
  admin: AdminContext,
  teacher: { name: string; email: string; password: string },
) {
  return createUserAccount({
    name: teacher.name,
    email: teacher.email,
    password: teacher.password,
    role: Role.TEACHER,
    instituteId: admin.instituteId,
  });
}

/**
 * Reset the password of a TEACHER or STUDENT in the admin's own institute.
 * Verifies the target belongs to this institute (and isn't another admin)
 * before delegating to the trusted setUserPassword primitive. Returns false if
 * the user isn't a resettable member of this institute.
 */
export async function resetUserPassword(
  admin: AdminContext,
  userId: string,
  newPassword: string,
): Promise<boolean> {
  const target = await prisma.user.findFirst({
    where: {
      id: userId,
      instituteId: admin.instituteId,
      role: { in: [Role.TEACHER, Role.STUDENT] },
    },
    select: { id: true },
  });
  if (!target) return false;

  await setUserPassword(userId, newPassword);
  return true;
}

/**
 * Enable or disable (soft) a TEACHER or STUDENT in the admin's institute.
 * Disabling keeps all the user's data/history but blocks app access; admins
 * can't disable themselves or other admins (only TEACHER/STUDENT targets).
 * When disabling, the target's sessions are revoked so they're signed out at
 * once. Returns false if the target isn't a valid member of this institute.
 */
export async function setUserActive(
  admin: AdminContext,
  userId: string,
  isActive: boolean,
): Promise<boolean> {
  if (userId === admin.id) return false;

  const target = await prisma.user.findFirst({
    where: {
      id: userId,
      instituteId: admin.instituteId,
      role: { in: [Role.TEACHER, Role.STUDENT] },
    },
    select: { id: true },
  });
  if (!target) return false;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { isActive } });
    if (!isActive) {
      await tx.session.deleteMany({ where: { userId } });
    }
  });
  return true;
}

/**
 * Every group in the admin's institute, with its owning teacher and student
 * count. Read-only institute-wide view; teachers still create and run their own
 * groups. Ordered by group name for a stable list.
 */
export function listInstituteGroups(instituteId: string) {
  return prisma.group.findMany({
    where: { instituteId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      teacherId: true,
      teacher: { select: { name: true, email: true } },
      _count: { select: { students: true } },
    },
  });
}

/** Active teachers for group create/edit dropdowns. */
export function listInstituteTeacherOptions(
  instituteId: string,
  includeTeacherId?: string,
) {
  return prisma.user.findMany({
    where: {
      instituteId,
      role: Role.TEACHER,
      OR: [
        { isActive: true },
        ...(includeTeacherId ? [{ id: includeTeacherId }] : []),
      ],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}

/**
 * A single group in the admin's institute. Returns null when missing or out of
 * scope.
 */
export function getAdminGroup(admin: AdminContext, groupId: string) {
  return prisma.group.findFirst({
    where: { id: groupId, instituteId: admin.instituteId },
    select: {
      id: true,
      name: true,
      teacherId: true,
      teacher: { select: { name: true, email: true } },
      _count: { select: { students: true } },
    },
  });
}

export type AdminGroupMutationResult =
  | { ok: true }
  | { ok: false; error: string };

/** Create a group owned by a teacher in the admin's institute. */
export async function createAdminGroup(
  admin: AdminContext,
  input: { name: string; teacherId: string },
): Promise<AdminGroupMutationResult> {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: "Group name is required." };
  }

  const teacher = await prisma.user.findFirst({
    where: {
      id: input.teacherId,
      instituteId: admin.instituteId,
      role: Role.TEACHER,
      isActive: true,
    },
    select: { id: true },
  });
  if (!teacher) {
    return { ok: false, error: "Teacher not found in this institute." };
  }

  await prisma.group.create({
    data: {
      name,
      teacherId: teacher.id,
      instituteId: admin.instituteId,
    },
  });

  return { ok: true };
}

/** Update a group's name and/or owning teacher. */
export async function updateAdminGroup(
  admin: AdminContext,
  groupId: string,
  input: { name: string; teacherId: string },
): Promise<AdminGroupMutationResult> {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: "Group name is required." };
  }

  const group = await prisma.group.findFirst({
    where: { id: groupId, instituteId: admin.instituteId },
    select: { id: true },
  });
  if (!group) {
    return { ok: false, error: "Group not found." };
  }

  const teacher = await prisma.user.findFirst({
    where: {
      id: input.teacherId,
      instituteId: admin.instituteId,
      role: Role.TEACHER,
      isActive: true,
    },
    select: { id: true },
  });
  if (!teacher) {
    return { ok: false, error: "Teacher not found in this institute." };
  }

  await prisma.group.update({
    where: { id: group.id },
    data: { name, teacherId: teacher.id },
  });

  return { ok: true };
}

export type DeleteAdminGroupResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "not-empty" };

/** Delete an empty group in the admin's institute. */
export async function deleteAdminGroup(
  admin: AdminContext,
  groupId: string,
): Promise<DeleteAdminGroupResult> {
  const group = await prisma.group.findFirst({
    where: { id: groupId, instituteId: admin.instituteId },
    select: { id: true, _count: { select: { students: true } } },
  });
  if (!group) return { ok: false, reason: "not-found" };
  if (group._count.students > 0) return { ok: false, reason: "not-empty" };

  await prisma.group.delete({ where: { id: group.id } });
  return { ok: true };
}

/**
 * Every student in the admin's institute, with their group placement and
 * current level. Read-only institute-wide view; teachers still own day-to-day
 * student management (adding, level assignment) within their groups.
 * Ordered by name for a stable list. Paginated for large institutes.
 */
export async function listInstituteStudents(
  instituteId: string,
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<PaginatedList<{
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  group: { name: string } | null;
  currentLevel: { name: string; orderIndex: number } | null;
}>> {
  const { skip, take, page: safePage, pageSize: safeSize } = paginationBounds(
    page,
    pageSize,
  );
  const where = { instituteId, role: Role.STUDENT };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        group: { select: { name: true } },
        currentLevel: { select: { name: true, orderIndex: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return buildPaginatedList(items, total, safePage, safeSize);
}

export type CreateStudentResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Create a STUDENT in one of the admin's institute groups. Optionally assign a
 * starting level (same rules as teachers). Email-uniqueness errors bubble up
 * from createUserAccount for the action to translate.
 */
export async function createStudentInGroup(
  admin: AdminContext,
  groupId: string,
  student: { name: string; email: string; password: string },
  levelId?: string | null,
): Promise<CreateStudentResult> {
  const group = await prisma.group.findFirst({
    where: { id: groupId, instituteId: admin.instituteId },
    select: { id: true },
  });
  if (!group) {
    return { ok: false, error: "Group not found in this institute." };
  }

  if (levelId) {
    const level = await prisma.level.findFirst({
      where: { id: levelId, instituteId: admin.instituteId },
      select: { id: true },
    });
    if (!level) {
      return { ok: false, error: "Level not found in this institute." };
    }
  }

  const user = await createUserAccount({
    name: student.name,
    email: student.email,
    password: student.password,
    role: Role.STUDENT,
    instituteId: admin.instituteId,
    groupId: group.id,
  });

  if (levelId) {
    const access = await checkStudentLevelAccess(
      user.id,
      admin.instituteId,
      levelId,
    );
    if (!access.allowed) {
      await prisma.user.delete({ where: { id: user.id } });
      return {
        ok: false,
        error: access.message ?? "That level is locked for a new student.",
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { currentLevelId: levelId },
    });
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Levels
//
// Levels are the practice curriculum. They are ordered per institute
// (orderIndex) and a student progresses through them. Only the admin defines
// them; the practice engine reads them when generating + grading sessions.
// ---------------------------------------------------------------------------

/** Every level in the admin's institute, in progression order. */
export function listLevels(instituteId: string) {
  return prisma.level.findMany({
    where: { instituteId },
    orderBy: { orderIndex: "asc" },
    select: {
      id: true,
      name: true,
      orderIndex: true,
      operation: true,
      termsPerQuestion: true,
      minNumber: true,
      maxNumber: true,
      questionCount: true,
      timeLimitSeconds: true,
      passAccuracy: true,
      requiresPreviousPass: true,
      _count: { select: { studentsOnLevel: true } },
    },
  });
}

/**
 * A single level, scoped to the admin's institute. Returns null if it does not
 * exist or belongs to another institute (so an admin can't edit foreign data).
 */
export function getLevel(admin: AdminContext, levelId: string) {
  return prisma.level.findFirst({
    where: { id: levelId, instituteId: admin.instituteId },
    select: {
      id: true,
      name: true,
      orderIndex: true,
      operation: true,
      termsPerQuestion: true,
      minNumber: true,
      maxNumber: true,
      questionCount: true,
      timeLimitSeconds: true,
      passAccuracy: true,
      requiresPreviousPass: true,
    },
  });
}

/**
 * Create a level in the admin's institute. A duplicate orderIndex hits the
 * `@@unique([instituteId, orderIndex])` constraint (P2002), which the caller
 * translates into a friendly message.
 */
export function createLevel(admin: AdminContext, input: LevelInput) {
  return prisma.level.create({
    data: { ...input, name: input.name.trim(), instituteId: admin.instituteId },
  });
}

/**
 * Update a level, but only if it belongs to the admin's institute. Uses
 * `updateMany` with an institute-scoped filter so a forged id can never touch
 * another institute's level; returns the number of rows changed (0 = not
 * found / not theirs).
 */
export async function updateLevel(
  admin: AdminContext,
  levelId: string,
  input: LevelInput,
): Promise<number> {
  const result = await prisma.level.updateMany({
    where: { id: levelId, instituteId: admin.instituteId },
    data: { ...input, name: input.name.trim() },
  });
  return result.count;
}

/** White-label fields an institute admin may view and edit. */
export type InstituteBranding = InstituteBrandingSettings;

/** Read branding for the signed-in admin's institute. */
export async function getInstituteBranding(
  admin: AdminContext,
): Promise<InstituteBranding | null> {
  return prisma.institute.findFirst({
    where: { id: admin.instituteId },
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      logoUrl: true,
      primaryColor: true,
    },
  });
}

export interface UpdateInstituteBrandingInput {
  name: string;
  tagline?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
}

/**
 * Update name, tagline, and logo for the admin's institute. Slug is read-only
 * here — only Super Admin can change it.
 */
export async function updateInstituteBranding(
  admin: AdminContext,
  input: UpdateInstituteBrandingInput,
): Promise<boolean> {
  const result = await prisma.institute.updateMany({
    where: { id: admin.instituteId },
    data: {
      name: input.name.trim(),
      tagline: input.tagline?.trim() || null,
      logoUrl: input.logoUrl?.trim() || null,
      primaryColor: input.primaryColor?.trim() || null,
    },
  });
  return result.count === 1;
}
