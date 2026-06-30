// Trusted curriculum version lifecycle for institute question banks.

import "server-only";

import { prisma } from "@/lib/prisma";
import { QuestionStatus } from "@/lib/generated/prisma/enums";
import { nextCurriculumVersionNumber } from "@/lib/curriculum-version";
import type { AdminContext } from "@/server/admin";
import type { Prisma } from "@/lib/generated/prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Resolve the active curriculum version id, creating v1 when missing. */
export async function getActiveCurriculumVersionId(
  instituteId: string,
  db: DbClient = prisma,
): Promise<string> {
  const institute = await db.institute.findUnique({
    where: { id: instituteId },
    select: { activeCurriculumVersionId: true },
  });
  if (institute?.activeCurriculumVersionId) {
    return institute.activeCurriculumVersionId;
  }

  const version = await ensureInitialCurriculumVersion(instituteId, db);
  return version.id;
}

/** Create version 1 and mark it active (idempotent when already set). */
export async function ensureInitialCurriculumVersion(
  instituteId: string,
  db: DbClient = prisma,
) {
  const existing = await db.curriculumVersion.findFirst({
    where: { instituteId, versionNumber: 1 },
    select: { id: true, versionNumber: true, label: true, publishedAt: true },
  });
  if (existing) {
    await db.institute.updateMany({
      where: { id: instituteId, activeCurriculumVersionId: null },
      data: { activeCurriculumVersionId: existing.id },
    });
    return existing;
  }

  const version = await db.curriculumVersion.create({
    data: { instituteId, versionNumber: 1 },
    select: { id: true, versionNumber: true, label: true, publishedAt: true },
  });

  await db.institute.update({
    where: { id: instituteId },
    data: { activeCurriculumVersionId: version.id },
  });

  return version;
}

/** Active version metadata for admin UI. */
export async function getActiveCurriculumVersion(instituteId: string) {
  const versionId = await getActiveCurriculumVersionId(instituteId);
  return prisma.curriculumVersion.findUnique({
    where: { id: versionId },
    select: {
      id: true,
      versionNumber: true,
      label: true,
      publishedAt: true,
      _count: {
        select: {
          levelQuestions: {
            where: {
              status: QuestionStatus.PUBLISHED,
              isActive: true,
            },
          },
        },
      },
    },
  });
}

/** Recent curriculum versions for admin history. */
export function listCurriculumVersions(admin: AdminContext, limit = 5) {
  return prisma.curriculumVersion.findMany({
    where: { instituteId: admin.instituteId },
    orderBy: { versionNumber: "desc" },
    take: limit,
    select: {
      id: true,
      versionNumber: true,
      label: true,
      publishedAt: true,
      _count: { select: { levelQuestions: true } },
    },
  });
}

export type BumpCurriculumVersionResult =
  | {
      ok: true;
      version: {
        id: string;
        versionNumber: number;
        label: string | null;
        publishedAt: Date;
      };
    }
  | { ok: false; error: string };

/**
 * Start a new active curriculum generation. Published questions stay on older
 * versions for audit; admins publish fresh rows into the new generation.
 */
export async function bumpCurriculumVersion(
  admin: AdminContext,
  label?: string | null,
): Promise<BumpCurriculumVersionResult> {
  const note = label?.trim() || null;

  return prisma.$transaction(async (tx) => {
    const max = await tx.curriculumVersion.aggregate({
      where: { instituteId: admin.instituteId },
      _max: { versionNumber: true },
    });

    const version = await tx.curriculumVersion.create({
      data: {
        instituteId: admin.instituteId,
        versionNumber: nextCurriculumVersionNumber(max._max.versionNumber),
        label: note,
      },
      select: {
        id: true,
        versionNumber: true,
        label: true,
        publishedAt: true,
      },
    });

    await tx.institute.update({
      where: { id: admin.instituteId },
      data: { activeCurriculumVersionId: version.id },
    });

    return { ok: true, version };
  });
}

/** Create v1 inside an existing institute bootstrap transaction. */
export async function createInitialCurriculumVersionInTransaction(
  tx: Prisma.TransactionClient,
  instituteId: string,
): Promise<string> {
  const version = await tx.curriculumVersion.create({
    data: { instituteId, versionNumber: 1 },
    select: { id: true },
  });

  await tx.institute.update({
    where: { id: instituteId },
    data: { activeCurriculumVersionId: version.id },
  });

  return version.id;
}
