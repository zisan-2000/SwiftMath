import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type GroupActor = { id: string; instituteId: string };

/** Membership narrows a capability; it never grants an RBAC permission. */
export function teacherGroupScope(actor: GroupActor): Prisma.GroupWhereInput {
  return {
    instituteId: actor.instituteId,
    teacherAssignments: {
      some: {
        teacherId: actor.id,
        instituteId: actor.instituteId,
        teacher: {
          role: "TEACHER",
          isActive: true,
          instituteId: actor.instituteId,
        },
      },
    },
  };
}

export function teacherHomeworkScope(
  actor: GroupActor,
): Prisma.HomeworkScheduleWhereInput {
  return {
    instituteId: actor.instituteId,
    originGroup: teacherGroupScope(actor),
  };
}

/** Lock ordering is shared with assignment replacement, so revocation cannot
 * interleave with a transaction which has already acquired group access. */
export async function lockTeacherGroup(
  tx: Prisma.TransactionClient,
  actor: GroupActor,
  groupId: string,
) {
  await tx.$queryRaw`SELECT id FROM "group" WHERE id = ${groupId} AND "instituteId" = ${actor.instituteId} FOR SHARE`;
  const group = await tx.group.findFirst({
    where: { id: groupId, ...teacherGroupScope(actor) },
    select: { id: true },
  });
  if (!group) throw new Error("Group access changed. Reload and try again.");
}

/** Group membership and student placement are held stable for the write. */
export async function withTeacherStudent<T>(
  actor: GroupActor,
  studentId: string,
  write: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T | null> {
  return prisma.$transaction(async (tx) => {
    const student = await tx.user.findFirst({
      where: {
        id: studentId,
        instituteId: actor.instituteId,
        role: "STUDENT",
        group: teacherGroupScope(actor),
      },
      select: { groupId: true },
    });
    if (!student?.groupId) return null;
    await lockTeacherGroup(tx, actor, student.groupId);
    await tx.$queryRaw`SELECT id FROM "user" WHERE id=${studentId} FOR UPDATE`;
    if (
      !(await tx.user.count({
        where: { id: studentId, groupId: student.groupId },
      }))
    )
      return null;
    return write(tx);
  });
}
