import "server-only";

import {
  AuditAction,
  PermissionEffect,
  Role,
} from "@/lib/generated/prisma/enums";
import {
  PERMISSION_METADATA,
  PERMISSIONS,
  isKnownPermission,
  resolveEffectivePermissions,
  type Permission,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { AdminContext } from "@/server/admin";
import { auditActorFromAdmin, recordAuditLog } from "@/server/audit-log";
import { can } from "@/server/permissions";

export interface PermissionControlRow {
  permission: Permission;
  label: string;
  description: string;
  domain: string;
  defaultEnabled: boolean;
  effectiveEnabled: boolean;
  explicitEffect: PermissionEffect | null;
}

export interface TeacherPermissionResult {
  ok: true;
}

export interface TeacherPermissionError {
  ok: false;
  error: string;
}

export type TeacherPermissionMutationResult =
  | TeacherPermissionResult
  | TeacherPermissionError;

function isTeacherAssignablePermission(value: string): value is Permission {
  return (
    isKnownPermission(value) &&
    (PERMISSION_METADATA[value].assignableTo as readonly Role[]).includes(
      Role.TEACHER,
    )
  );
}

function teacherAssignablePermissions(): Permission[] {
  return Object.entries(PERMISSION_METADATA)
    .filter(([, metadata]) =>
      (metadata.assignableTo as readonly Role[]).includes(Role.TEACHER),
    )
    .map(([permission]) => permission as Permission)
    .sort((left, right) => {
      const leftMeta = PERMISSION_METADATA[left];
      const rightMeta = PERMISSION_METADATA[right];
      return (
        leftMeta.domain.localeCompare(rightMeta.domain) ||
        leftMeta.label.localeCompare(rightMeta.label)
      );
    });
}

async function getScopedTeacher(admin: AdminContext, teacherId: string) {
  if (teacherId === admin.id) return null;

  return prisma.user.findFirst({
    where: {
      id: teacherId,
      instituteId: admin.instituteId,
      role: Role.TEACHER,
    },
    select: {
      id: true,
      name: true,
      permissionOverrides: {
        select: { permission: true, effect: true },
      },
    },
  });
}

export async function listTeacherPermissionControls(
  admin: AdminContext,
  teacherId: string,
): Promise<PermissionControlRow[]> {
  const teacher = await getScopedTeacher(admin, teacherId);
  if (!teacher) return [];

  const defaultPermissions = resolveEffectivePermissions(Role.TEACHER, []);
  const effectivePermissions = resolveEffectivePermissions(
    Role.TEACHER,
    teacher.permissionOverrides,
  );
  const overridesByPermission = new Map(
    teacher.permissionOverrides
      .filter((override) => isTeacherAssignablePermission(override.permission))
      .map((override) => [override.permission, override.effect]),
  );

  return teacherAssignablePermissions().map((permission) => {
    const metadata = PERMISSION_METADATA[permission];
    return {
      permission,
      label: metadata.label,
      description: metadata.description,
      domain: metadata.domain,
      defaultEnabled: defaultPermissions.has(permission),
      effectiveEnabled: effectivePermissions.has(permission),
      explicitEffect: overridesByPermission.get(permission) ?? null,
    };
  });
}

export async function setTeacherPermissionOverride(
  admin: AdminContext,
  teacherId: string,
  permission: string,
  effect: PermissionEffect | null,
): Promise<TeacherPermissionMutationResult> {
  const canManageTeacherPermissions = await can(
    { id: admin.id, role: Role.ADMIN },
    PERMISSIONS.TEACHER_PERMISSIONS_MANAGE,
  );
  if (!canManageTeacherPermissions) {
    return {
      ok: false,
      error: "You are not allowed to manage teacher permissions.",
    };
  }

  if (!isTeacherAssignablePermission(permission)) {
    return {
      ok: false,
      error: "That permission cannot be assigned to teachers.",
    };
  }

  if (!(await can({ id: admin.id, role: Role.ADMIN }, permission))) {
    return {
      ok: false,
      error: "You cannot grant a permission you do not hold.",
    };
  }

  const teacher = await getScopedTeacher(admin, teacherId);
  if (!teacher) {
    return { ok: false, error: "Teacher not found in this institute." };
  }

  const existing = teacher.permissionOverrides.find(
    (override) => override.permission === permission,
  );

  if (effect === null) {
    if (!existing) return { ok: true };

    await prisma.userPermission.delete({
      where: { userId_permission: { userId: teacher.id, permission } },
    });
  } else {
    await prisma.userPermission.upsert({
      where: { userId_permission: { userId: teacher.id, permission } },
      create: {
        userId: teacher.id,
        permission,
        effect,
        grantedById: admin.id,
      },
      update: {
        effect,
        grantedById: admin.id,
      },
    });
  }

  const metadata = PERMISSION_METADATA[permission];
  const action =
    effect === PermissionEffect.ALLOW ||
    (effect === null && existing?.effect === PermissionEffect.DENY)
      ? AuditAction.PERMISSION_GRANTED
      : AuditAction.PERMISSION_REVOKED;
  const newEffect = effect ?? "DEFAULT";

  await recordAuditLog({
    actor: auditActorFromAdmin(admin),
    action,
    targetType: "UserPermission",
    targetId: teacher.id,
    summary: `${metadata.label} set to ${String(newEffect).toLowerCase()} for ${teacher.name}.`,
    metadata: {
      targetUserId: teacher.id,
      targetRole: Role.TEACHER,
      permission,
      previousEffect: existing?.effect ?? "DEFAULT",
      effect: newEffect,
    },
  });

  return { ok: true };
}
