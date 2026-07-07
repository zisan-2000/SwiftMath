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
import type { SessionUser } from "@/lib/session";
import { recordAuditLog } from "@/server/audit-log";
import { notifyUserPermissionChanged } from "@/server/notifications";
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

export type PermissionMutationResult =
  | { ok: true }
  | { ok: false; error: string };

type PermissionActor = Pick<
  SessionUser,
  "id" | "name" | "role" | "instituteId"
>;

type TargetUser = {
  id: string;
  name: string;
  role: Role;
  instituteId: string;
  permissionOverrides: { permission: string; effect: PermissionEffect }[];
};

function roleLabel(role: Role): string {
  switch (role) {
    case Role.ADMIN:
      return "Admin";
    case Role.TEACHER:
      return "Teacher";
    case Role.STUDENT:
      return "Student";
    case Role.SUPER_ADMIN:
      return "Super Admin";
    default:
      return "User";
  }
}

function isAssignablePermission(
  value: string,
  targetRole: Role,
): value is Permission {
  return (
    isKnownPermission(value) &&
    (PERMISSION_METADATA[value].assignableTo as readonly Role[]).includes(
      targetRole,
    )
  );
}

function assignablePermissionsForRole(targetRole: Role): Permission[] {
  return Object.entries(PERMISSION_METADATA)
    .filter(([, metadata]) =>
      (metadata.assignableTo as readonly Role[]).includes(targetRole),
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

function permissionControlsForTarget(target: TargetUser): PermissionControlRow[] {
  const defaultPermissions = resolveEffectivePermissions(target.role, []);
  const effectivePermissions = resolveEffectivePermissions(
    target.role,
    target.permissionOverrides,
  );
  const overridesByPermission = new Map(
    target.permissionOverrides
      .filter((override) =>
        isAssignablePermission(override.permission, target.role),
      )
      .map((override) => [override.permission, override.effect]),
  );

  return assignablePermissionsForRole(target.role).map((permission) => {
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

async function getScopedTarget(input: {
  targetId: string;
  targetRole: Role;
  instituteId: string;
}): Promise<TargetUser | null> {
  return prisma.user.findFirst({
    where: {
      id: input.targetId,
      instituteId: input.instituteId,
      role: input.targetRole,
    },
    select: {
      id: true,
      name: true,
      role: true,
      instituteId: true,
      permissionOverrides: {
        select: { permission: true, effect: true },
      },
    },
  });
}

async function listPermissionControlsForTarget(input: {
  targetId: string;
  targetRole: Role;
  instituteId: string;
}): Promise<PermissionControlRow[]> {
  const target = await getScopedTarget(input);
  return target ? permissionControlsForTarget(target) : [];
}

async function actorMaySetPermission(input: {
  actor: PermissionActor;
  targetRole: Role;
  permission: Permission;
}): Promise<boolean> {
  if (input.actor.role === Role.SUPER_ADMIN && input.targetRole === Role.ADMIN) {
    return true;
  }
  return can(input.actor, input.permission);
}

async function setPermissionOverride(input: {
  actor: PermissionActor;
  targetId: string;
  targetRole: Role;
  instituteId: string;
  managePermission: Permission;
  permission: string;
  effect: PermissionEffect | null;
}): Promise<PermissionMutationResult> {
  const manageAllowed = await can(input.actor, input.managePermission);
  if (!manageAllowed) {
    return {
      ok: false,
      error: `You are not allowed to manage ${roleLabel(
        input.targetRole,
      ).toLowerCase()} permissions.`,
    };
  }

  const target = await getScopedTarget(input);
  if (!target) {
    return {
      ok: false,
      error: `${roleLabel(input.targetRole)} not found in this institute.`,
    };
  }

  if (target.id === input.actor.id) {
    return { ok: false, error: "You cannot change your own permissions." };
  }

  if (!isAssignablePermission(input.permission, target.role)) {
    return {
      ok: false,
      error: `That permission cannot be assigned to ${roleLabel(
        target.role,
      ).toLowerCase()}s.`,
    };
  }

  if (
    !(await actorMaySetPermission({
      actor: input.actor,
      targetRole: target.role,
      permission: input.permission,
    }))
  ) {
    return {
      ok: false,
      error: "You cannot grant a permission you do not hold.",
    };
  }

  const existing = target.permissionOverrides.find(
    (override) => override.permission === input.permission,
  );
  if ((existing?.effect ?? null) === input.effect) {
    return { ok: true };
  }

  if (input.effect === null) {
    await prisma.userPermission.delete({
      where: {
        userId_permission: {
          userId: target.id,
          permission: input.permission,
        },
      },
    });
  } else {
    await prisma.userPermission.upsert({
      where: {
        userId_permission: {
          userId: target.id,
          permission: input.permission,
        },
      },
      create: {
        userId: target.id,
        permission: input.permission,
        effect: input.effect,
        grantedById: input.actor.id,
      },
      update: {
        effect: input.effect,
        grantedById: input.actor.id,
      },
    });
  }

  const metadata = PERMISSION_METADATA[input.permission];
  const action =
    input.effect === PermissionEffect.ALLOW ||
    (input.effect === null && existing?.effect === PermissionEffect.DENY)
      ? AuditAction.PERMISSION_GRANTED
      : AuditAction.PERMISSION_REVOKED;
  const newEffect = input.effect ?? "DEFAULT";

  await recordAuditLog({
    actor: {
      userId: input.actor.id,
      instituteId: target.instituteId,
      role: input.actor.role,
    },
    action,
    targetType: "UserPermission",
    targetId: target.id,
    summary: `${metadata.label} set to ${String(newEffect).toLowerCase()} for ${target.name}.`,
    metadata: {
      targetUserId: target.id,
      targetRole: target.role,
      permission: input.permission,
      previousEffect: existing?.effect ?? "DEFAULT",
      effect: newEffect,
    },
  });

  await notifyUserPermissionChanged({
    instituteId: target.instituteId,
    userId: target.id,
    role: target.role,
    permission: input.permission,
    permissionLabel: metadata.label,
    effect: newEffect,
    actorUserId: input.actor.id,
    actorName: input.actor.name,
  });

  return { ok: true };
}

export function listTeacherPermissionControls(
  admin: PermissionActor,
  teacherId: string,
): Promise<PermissionControlRow[]> {
  return listPermissionControlsForTarget({
    targetId: teacherId,
    targetRole: Role.TEACHER,
    instituteId: admin.instituteId,
  });
}

export function setTeacherPermissionOverride(
  admin: PermissionActor,
  teacherId: string,
  permission: string,
  effect: PermissionEffect | null,
): Promise<PermissionMutationResult> {
  return setPermissionOverride({
    actor: admin,
    targetId: teacherId,
    targetRole: Role.TEACHER,
    instituteId: admin.instituteId,
    managePermission: PERMISSIONS.TEACHER_PERMISSIONS_MANAGE,
    permission,
    effect,
  });
}

export function listStudentPermissionControls(
  admin: PermissionActor,
  studentId: string,
): Promise<PermissionControlRow[]> {
  return listPermissionControlsForTarget({
    targetId: studentId,
    targetRole: Role.STUDENT,
    instituteId: admin.instituteId,
  });
}

export function setStudentPermissionOverride(
  admin: PermissionActor,
  studentId: string,
  permission: string,
  effect: PermissionEffect | null,
): Promise<PermissionMutationResult> {
  return setPermissionOverride({
    actor: admin,
    targetId: studentId,
    targetRole: Role.STUDENT,
    instituteId: admin.instituteId,
    managePermission: PERMISSIONS.STUDENT_PERMISSIONS_MANAGE,
    permission,
    effect,
  });
}

export function listInstituteAdminPermissionControls(
  superAdmin: PermissionActor,
  instituteId: string,
  adminId: string,
): Promise<PermissionControlRow[]> {
  void superAdmin;
  return listPermissionControlsForTarget({
    targetId: adminId,
    targetRole: Role.ADMIN,
    instituteId,
  });
}

export function setInstituteAdminPermissionOverride(
  superAdmin: PermissionActor,
  instituteId: string,
  adminId: string,
  permission: string,
  effect: PermissionEffect | null,
): Promise<PermissionMutationResult> {
  return setPermissionOverride({
    actor: superAdmin,
    targetId: adminId,
    targetRole: Role.ADMIN,
    instituteId,
    managePermission: PERMISSIONS.ADMIN_PERMISSIONS_MANAGE,
    permission,
    effect,
  });
}
