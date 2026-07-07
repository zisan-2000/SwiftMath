import { describe, expect, it } from "vitest";

import { Role } from "@/lib/generated/prisma/enums";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  PERMISSION_METADATA,
  getRoleDefaultPermissions,
  isKnownPermission,
  permissionsByScope,
  roleHasPermission,
} from "@/lib/permissions";

describe("permission catalog", () => {
  it("has metadata for every permission", () => {
    expect(Object.keys(PERMISSION_METADATA).sort()).toEqual(
      [...ALL_PERMISSIONS].sort(),
    );
  });

  it("validates known permission strings", () => {
    expect(isKnownPermission(PERMISSIONS.TEACHER_CREATE)).toBe(true);
    expect(isKnownPermission("teacher:fly")).toBe(false);
  });
});

describe("role default permissions", () => {
  it("gives super admins platform permissions only in phase 1", () => {
    const permissions = getRoleDefaultPermissions(Role.SUPER_ADMIN);

    for (const permission of permissionsByScope("platform")) {
      expect(permissions.has(permission)).toBe(true);
    }

    expect(permissions.has(PERMISSIONS.TEACHER_CREATE)).toBe(false);
    expect(permissions.has(PERMISSIONS.LEVEL_MANAGE)).toBe(false);
  });

  it("gives institute admins every institute-scoped permission", () => {
    const permissions = getRoleDefaultPermissions(Role.ADMIN);

    for (const permission of permissionsByScope("institute")) {
      expect(permissions.has(permission)).toBe(true);
    }

    expect(permissions.has(PERMISSIONS.INSTITUTE_CREATE)).toBe(false);
  });

  it("keeps teacher defaults scoped to classroom operations", () => {
    expect(roleHasPermission(Role.TEACHER, PERMISSIONS.STUDENT_CREATE)).toBe(
      true,
    );
    expect(roleHasPermission(Role.TEACHER, PERMISSIONS.EXAM_SCHEDULE)).toBe(
      true,
    );
    expect(roleHasPermission(Role.TEACHER, PERMISSIONS.LEVEL_MANAGE)).toBe(
      false,
    );
    expect(roleHasPermission(Role.TEACHER, PERMISSIONS.TEACHER_CREATE)).toBe(
      false,
    );
  });

  it("keeps students out of the permission system", () => {
    expect(getRoleDefaultPermissions(Role.STUDENT).size).toBe(0);
  });
});
