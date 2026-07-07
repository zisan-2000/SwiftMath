import { describe, expect, it } from "vitest";

import { Role } from "@/lib/generated/prisma/enums";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  PERMISSION_METADATA,
  getRoleDefaultPermissions,
  isKnownPermission,
  permissionsByScope,
  resolveEffectivePermissions,
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

describe("effective permission resolver", () => {
  it("allows teacher permissions beyond role defaults", () => {
    const permissions = resolveEffectivePermissions(Role.TEACHER, [
      { permission: PERMISSIONS.LEVEL_MANAGE, effect: "ALLOW" },
    ]);

    expect(permissions.has(PERMISSIONS.LEVEL_MANAGE)).toBe(true);
  });

  it("denies teacher default permissions", () => {
    const permissions = resolveEffectivePermissions(Role.TEACHER, [
      { permission: PERMISSIONS.EXAM_SCHEDULE, effect: "DENY" },
    ]);

    expect(permissions.has(PERMISSIONS.EXAM_SCHEDULE)).toBe(false);
  });

  it("ignores stale permission strings from the database", () => {
    const permissions = resolveEffectivePermissions(Role.TEACHER, [
      { permission: "old:permission", effect: "ALLOW" },
    ]);

    expect(permissions.has(PERMISSIONS.GROUP_MANAGE)).toBe(true);
    expect(permissions.has(PERMISSIONS.LEVEL_MANAGE)).toBe(false);
  });

  it("allows super admins to deny admin role defaults in phase 3", () => {
    const permissions = resolveEffectivePermissions(Role.ADMIN, [
      { permission: PERMISSIONS.STUDENT_CREATE, effect: "DENY" },
    ]);

    expect(permissions.has(PERMISSIONS.STUDENT_CREATE)).toBe(false);
  });

  it("keeps super admin role defaults fixed even if a deny override exists", () => {
    const permissions = resolveEffectivePermissions(Role.SUPER_ADMIN, [
      { permission: PERMISSIONS.INSTITUTE_CREATE, effect: "DENY" },
    ]);

    expect(permissions.has(PERMISSIONS.INSTITUTE_CREATE)).toBe(true);
  });
});

describe("role default permissions", () => {
  it("gives super admins platform permissions only", () => {
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

  it("gives students only self-service practice permissions", () => {
    const permissions = getRoleDefaultPermissions(Role.STUDENT);

    expect(permissions.has(PERMISSIONS.STUDENT_PRACTICE_START)).toBe(true);
    expect(permissions.has(PERMISSIONS.STUDENT_PRACTICE_SUBMIT)).toBe(true);
    expect(permissions.has(PERMISSIONS.STUDENT_EXAM_START)).toBe(true);
    expect(permissions.has(PERMISSIONS.STUDENT_CREATE)).toBe(false);
  });
});
