// Trusted audit trail writes and institute-scoped reads.

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  buildPaginatedList,
  DEFAULT_PAGE_SIZE,
  paginationBounds,
  type PaginatedList,
} from "@/lib/pagination";
import { AuditAction, Role } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { AdminContext } from "@/server/admin";
import type { TeacherContext } from "@/server/teacher";

export interface AuditActor {
  userId: string;
  instituteId: string;
  role: Role;
}

export interface RecordAuditLogInput {
  actor: AuditActor;
  action: AuditAction;
  targetType: string;
  targetId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}

export interface AuditLogListItem {
  id: string;
  action: AuditAction;
  summary: string;
  actorName: string;
  actorRole: Role;
  targetType: string;
  targetId: string | null;
  createdAt: Date;
}

export function auditActorFromAdmin(admin: AdminContext): AuditActor {
  return {
    userId: admin.id,
    instituteId: admin.instituteId,
    role: Role.ADMIN,
  };
}

export function auditActorFromTeacher(teacher: TeacherContext): AuditActor {
  return {
    userId: teacher.id,
    instituteId: teacher.instituteId,
    role: Role.TEACHER,
  };
}

/** Append one audit event. Failures are logged but never block the main mutation. */
export async function recordAuditLog(input: RecordAuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        instituteId: input.actor.instituteId,
        actorUserId: input.actor.userId,
        actorRole: input.actor.role,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        summary: input.summary,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error("[audit-log] failed to record event", error);
  }
}

/** Paginated institute activity log for admins (newest first). */
export async function listInstituteAuditLogs(
  admin: AdminContext,
  options: { page?: number; action?: AuditAction | null } = {},
): Promise<PaginatedList<AuditLogListItem>> {
  const { skip, take, page, pageSize } = paginationBounds(options.page ?? 1);

  const where = {
    instituteId: admin.instituteId,
    ...(options.action ? { action: options.action } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        action: true,
        summary: true,
        actorRole: true,
        targetType: true,
        targetId: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return buildPaginatedList(
    rows.map((row) => ({
      id: row.id,
      action: row.action,
      summary: row.summary,
      actorName: row.actor.name,
      actorRole: row.actorRole,
      targetType: row.targetType,
      targetId: row.targetId,
      createdAt: row.createdAt,
    })),
    total,
    page,
    pageSize,
  );
}
