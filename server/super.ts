// Trusted, server-only logic for the SUPER_ADMIN (platform operator) flow.
//
// Unlike the institute-scoped ADMIN, a Super Admin works ACROSS every
// institute. The functions here deliberately do NOT filter by `instituteId`:
// they aggregate and list platform-wide data. Callers (server actions / pages)
// must still gate access with `requireSuperAdmin()` — this module trusts that
// the caller is authorised.

import "server-only";

import { hashPassword } from "better-auth/crypto";

import { prisma } from "@/lib/prisma";
import { DEFAULT_STARTER_LEVELS } from "@/lib/default-levels";
import { buildStarterQuestionBankRows } from "@/lib/default-question-bank";
import { createInitialCurriculumVersionInTransaction } from "@/server/curriculum-version";
import { createUserAccount, setUserPassword } from "@/server/users";
import { Role } from "@/lib/generated/prisma/enums";

/** Platform-wide headline counts for the Super Admin dashboard. */
export async function getPlatformStats() {
  const [institutes, admins, teachers, students] = await Promise.all([
    prisma.institute.count(),
    prisma.user.count({ where: { role: Role.ADMIN } }),
    prisma.user.count({ where: { role: Role.TEACHER } }),
    prisma.user.count({ where: { role: Role.STUDENT } }),
  ]);
  return { institutes, admins, teachers, students };
}

/**
 * Every institute on the platform with its per-tenant user counts, newest
 * first. Used by the Super Admin institutes list.
 */
export async function listInstitutesWithStats() {
  const institutes = await prisma.institute.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      logoUrl: true,
      isActive: true,
      createdAt: true,
      _count: { select: { users: true, groups: true, levels: true } },
    },
  });
  return institutes;
}

/** Fields needed to stand up a brand-new institute plus its first ADMIN. */
export interface CreateInstituteParams {
  name: string;
  slug: string;
  /** Optional white-label branding (Phase 2.3). */
  tagline?: string | null;
  logoUrl?: string | null;
  admin: { name: string; email: string; password: string };
}

/**
 * Create a new institute together with its first ADMIN account, the default
 * starter curriculum (9 practice levels), and a starter question bank, in a
 * single transaction so we never end up with an institute that has no way in
 * or nothing to practice. The admin's credential row mirrors the better-auth
 * email/password shape (see `server/users.ts`) so they can sign in immediately.
 *
 * Throws on a unique-constraint violation (P2002) — either the slug is taken
 * (institute.slug) or the admin email is taken (user.email). The caller maps
 * that to a friendly message.
 */
export async function createInstitute(params: CreateInstituteParams) {
  const name = params.name.trim();
  const slug = params.slug.trim().toLowerCase();
  // Normalize optional branding: blank strings become null so the UI cleanly
  // falls back to platform defaults.
  const tagline = params.tagline?.trim() || null;
  const logoUrl = params.logoUrl?.trim() || null;
  const adminName = params.admin.name.trim();
  const adminEmail = params.admin.email.trim().toLowerCase();
  const passwordHash = await hashPassword(params.admin.password);

  return prisma.$transaction(async (tx) => {
    const institute = await tx.institute.create({
      data: { name, slug, tagline, logoUrl },
    });

    await tx.level.createMany({
      data: DEFAULT_STARTER_LEVELS.map((def) => ({
        ...def,
        instituteId: institute.id,
      })),
    });

    const levels = await tx.level.findMany({
      where: { instituteId: institute.id },
      select: { id: true, orderIndex: true },
    });

    const curriculumVersionId =
      await createInitialCurriculumVersionInTransaction(tx, institute.id);

    const bankRows = buildStarterQuestionBankRows({
      instituteId: institute.id,
      levels,
      curriculumVersionId,
    });
    if (bankRows.length > 0) {
      await tx.levelQuestion.createMany({ data: bankRows });
    }

    const admin = await tx.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        role: Role.ADMIN,
        instituteId: institute.id,
        emailVerified: true,
      },
    });

    await tx.account.create({
      data: {
        userId: admin.id,
        accountId: admin.id,
        providerId: "credential",
        password: passwordHash,
      },
    });

    return institute;
  });
}

/** Editable institute fields (branding + identity). Admin/users are untouched. */
export interface UpdateInstituteParams {
  name: string;
  slug: string;
  tagline?: string | null;
  logoUrl?: string | null;
}

/**
 * Update an institute's identity + white-label branding. Does NOT touch its
 * users, levels, or active state. Normalizes the slug + optional branding the
 * same way `createInstitute` does. Returns false if the institute doesn't
 * exist. Throws on a slug unique-constraint violation (P2002) for the caller
 * to translate.
 */
export async function updateInstitute(
  instituteId: string,
  params: UpdateInstituteParams,
): Promise<boolean> {
  const existing = await prisma.institute.findUnique({
    where: { id: instituteId },
    select: { id: true },
  });
  if (!existing) return false;

  await prisma.institute.update({
    where: { id: instituteId },
    data: {
      name: params.name.trim(),
      slug: params.slug.trim().toLowerCase(),
      tagline: params.tagline?.trim() || null,
      logoUrl: params.logoUrl?.trim() || null,
    },
  });
  return true;
}

/**
 * Enable or disable (soft) an institute platform-wide. Disabling keeps all the
 * institute's data but blocks every member's app access (enforced in
 * `requireUser`, which checks the institute's active flag). When disabling we
 * also revoke the sessions of all that institute's users so the change takes
 * effect immediately. Returns false if the institute doesn't exist.
 */
export async function setInstituteActive(
  instituteId: string,
  isActive: boolean,
): Promise<boolean> {
  const institute = await prisma.institute.findUnique({
    where: { id: instituteId },
    select: { id: true },
  });
  if (!institute) return false;

  await prisma.$transaction(async (tx) => {
    await tx.institute.update({
      where: { id: instituteId },
      data: { isActive },
    });
    if (!isActive) {
      await tx.session.deleteMany({ where: { user: { instituteId } } });
    }
  });
  return true;
}

/**
 * Full institute detail for the Super Admin drill-in page: identity, branding,
 * role counts, and every ADMIN account in the tenant (for support actions like
 * password reset).
 */
export async function getInstituteDetail(instituteId: string) {
  const institute = await prisma.institute.findUnique({
    where: { id: instituteId },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      logoUrl: true,
      isActive: true,
      createdAt: true,
    },
  });
  if (!institute) return null;

  const [admins, teachers, students, groups, levels] = await Promise.all([
    prisma.user.findMany({
      where: { instituteId, role: Role.ADMIN },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where: { instituteId, role: Role.TEACHER } }),
    prisma.user.count({ where: { instituteId, role: Role.STUDENT } }),
    prisma.group.count({ where: { instituteId } }),
    prisma.level.count({ where: { instituteId } }),
  ]);

  return { institute, admins, teachers, students, groups, levels };
}

export type CreateInstituteAdminResult =
  | { ok: true }
  | { ok: false; error: string };

/** Create an additional ADMIN account inside an existing institute. */
export async function createInstituteAdmin(
  instituteId: string,
  input: { name: string; email: string; password: string },
): Promise<CreateInstituteAdminResult> {
  const institute = await prisma.institute.findUnique({
    where: { id: instituteId },
    select: { id: true },
  });
  if (!institute) {
    return { ok: false, error: "Institute not found." };
  }

  await createUserAccount({
    name: input.name,
    email: input.email,
    password: input.password,
    role: Role.ADMIN,
    instituteId,
  });

  return { ok: true };
}

export type SetInstituteAdminActiveResult =
  | { ok: true }
  | { ok: false; error: string };

/** Enable/disable an institute ADMIN, preserving at least one active admin. */
export async function setInstituteAdminActive(
  instituteId: string,
  userId: string,
  isActive: boolean,
): Promise<SetInstituteAdminActiveResult> {
  const target = await prisma.user.findFirst({
    where: { id: userId, instituteId, role: Role.ADMIN },
    select: { id: true, isActive: true },
  });
  if (!target) {
    return { ok: false, error: "Admin not found in this institute." };
  }

  if (!isActive && target.isActive) {
    const activeAdmins = await prisma.user.count({
      where: { instituteId, role: Role.ADMIN, isActive: true },
    });
    if (activeAdmins <= 1) {
      return {
        ok: false,
        error: "This institute must keep at least one active admin.",
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { isActive },
    });
    if (!isActive) {
      await tx.session.deleteMany({ where: { userId } });
    }
  });

  return { ok: true };
}

/**
 * Reset the password of an ADMIN in a specific institute. Verifies the target
 * belongs to that institute and is an ADMIN before delegating to the trusted
 * `setUserPassword` primitive. Returns false if the user isn't a valid admin
 * of this institute.
 */
export async function resetInstituteAdminPassword(
  instituteId: string,
  userId: string,
  newPassword: string,
): Promise<boolean> {
  const target = await prisma.user.findFirst({
    where: { id: userId, instituteId, role: Role.ADMIN },
    select: { id: true },
  });
  if (!target) return false;

  await setUserPassword(userId, newPassword);
  return true;
}
