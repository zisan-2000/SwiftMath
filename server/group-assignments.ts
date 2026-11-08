import "server-only";
import { prisma } from "@/lib/prisma";
import { can } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import type { GroupActor } from "@/server/group-access";

export type GroupAssignmentInput = {
  name: string;
  teacherIds: string[];
  revision?: number;
};
type Result = { ok: true; revision: number } | { ok: false; error: string };

/** Defense in depth: neither an assignment nor an ALLOW override makes a teacher an admin. */
async function assignmentAdmin(actor: GroupActor) {
  const admin = await prisma.user.findFirst({
    where: {
      id: actor.id,
      instituteId: actor.instituteId,
      role: "ADMIN",
      isActive: true,
      institute: { isActive: true },
    },
    select: { id: true, role: true },
  });
  if (!admin || !(await can(admin, PERMISSIONS.GROUP_MANAGE))) return null;
  return { assign: await can(admin, PERMISSIONS.GROUP_ASSIGN_TEACHER) };
}

export async function saveAdminGroupAssignments(
  actor: GroupActor,
  input: GroupAssignmentInput,
  groupId?: string,
): Promise<Result> {
  const capabilities = await assignmentAdmin(actor);
  if (!capabilities)
    return {
      ok: false,
      error: "Only an authorized institute admin can assign teachers.",
    };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Group name is required." };
  const teacherIds = [...new Set(input.teacherIds)];
  if (teacherIds.some((id) => !id || id.length > 200))
    return { ok: false, error: "Choose valid teachers." };
  if (groupId && (!Number.isSafeInteger(input.revision) || input.revision! < 1))
    return { ok: false, error: "Reload this group before saving." };
  return prisma.$transaction(async (tx) => {
    if (groupId)
      await tx.$queryRaw`SELECT id FROM "group" WHERE id=${groupId} AND "instituteId"=${actor.instituteId} FOR UPDATE`;
    const current = groupId
      ? await tx.group.findFirst({
          where: { id: groupId, instituteId: actor.instituteId },
          select: {
            assignmentRevision: true,
            teacherAssignments: { select: { teacherId: true } },
          },
        })
      : null;
    if (groupId && !current) return { ok: false, error: "Group not found." };
    if (current && current.assignmentRevision !== input.revision)
      return {
        ok: false,
        error:
          "Another admin changed this group. Reload before saving; no assignments were overwritten.",
      };
    const previous =
      current?.teacherAssignments.map((row) => row.teacherId) ?? [];
    const membershipChanged =
      previous.length !== teacherIds.length ||
      teacherIds.some((id) => !previous.includes(id));
    if (membershipChanged && !capabilities.assign)
      return {
        ok: false,
        error:
          "Teacher assignment permission is required to change this selection.",
      };
    const teachers = await tx.user.findMany({
      where: {
        id: { in: teacherIds },
        instituteId: actor.instituteId,
        role: "TEACHER",
        OR: [{ isActive: true }, { id: { in: previous } }],
      },
      select: { id: true },
    });
    if (teachers.length !== teacherIds.length)
      return {
        ok: false,
        error:
          "Select active teachers from your own institute. Existing disabled teachers may be retained or removed.",
      };
    const group = groupId
      ? await tx.group.update({
          where: { id: groupId },
          data: {
            name,
            teacherId: teacherIds[0] ?? null,
            assignmentRevision: { increment: 1 },
          },
        })
      : await tx.group.create({
          data: {
            name,
            instituteId: actor.instituteId,
            teacherId: teacherIds[0] ?? null,
          },
        });
    // Only membership rows are removed. Domain records and retained membership metadata survive.
    await tx.teacherGroupAssignment.deleteMany({
      where: { groupId: group.id, teacherId: { notIn: teacherIds } },
    });
    await tx.teacherGroupAssignment.createMany({
      data: teacherIds
        .filter((id) => !previous.includes(id))
        .map((teacherId) => ({
          groupId: group.id,
          teacherId,
          instituteId: actor.instituteId,
          assignedById: actor.id,
        })),
      skipDuplicates: true,
    });
    await tx.auditLog.create({
      data: {
        instituteId: actor.instituteId,
        actorUserId: actor.id,
        actorRole: "ADMIN",
        action: "GROUP_TEACHERS_UPDATED",
        scopeGroupId: group.id,
        targetType: "Group",
        targetId: group.id,
        summary: `Updated teachers for ${name}.`,
        metadata: {
          groupId: group.id,
          previousTeacherIds: previous,
          teacherIds,
          revision: group.assignmentRevision,
        },
      },
    });
    return { ok: true, revision: group.assignmentRevision };
  });
}
