import { beforeEach, describe, expect, it, vi } from "vitest";

import { PermissionEffect, Role } from "@/lib/generated/prisma/enums";
import { PERMISSIONS } from "@/lib/permissions";

// `server/user-permissions.ts` is a `server-only` module that talks to Prisma,
// the permission resolver, audit log, and notifications. We stub those side
// effects so these tests exercise only the guardrail logic (fail-closed).
const { prismaMock, canMock, recordAuditLogMock, notifyMock } = vi.hoisted(
  () => ({
    prismaMock: {
      user: { findFirst: vi.fn() },
      userPermission: { upsert: vi.fn(), delete: vi.fn() },
    },
    canMock: vi.fn(),
    recordAuditLogMock: vi.fn(),
    notifyMock: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/permissions", () => ({ can: canMock }));
vi.mock("@/server/audit-log", () => ({ recordAuditLog: recordAuditLogMock }));
vi.mock("@/server/notifications", () => ({
  notifyUserPermissionChanged: notifyMock,
}));

import {
  setInstituteAdminPermissionOverride,
  setTeacherPermissionOverride,
} from "@/server/user-permissions";

type Actor = Parameters<typeof setTeacherPermissionOverride>[0];

const admin: Actor = {
  id: "admin-1",
  name: "Admin One",
  role: Role.ADMIN,
  instituteId: "inst-1",
};

const superAdmin: Actor = {
  id: "super-1",
  name: "Super One",
  role: Role.SUPER_ADMIN,
  instituteId: "platform",
};

type TargetOverride = { permission: string; effect: PermissionEffect };

/** Make `can(actor, p)` resolve true only for the listed permissions. */
function actorHolds(...permissions: string[]) {
  const held = new Set(permissions);
  canMock.mockImplementation(async (_actor: unknown, permission: string) =>
    held.has(permission),
  );
}

function mockTarget(target: {
  id: string;
  role: Role;
  instituteId?: string;
  overrides?: TargetOverride[];
}) {
  prismaMock.user.findFirst.mockResolvedValue({
    id: target.id,
    name: "Target User",
    role: target.role,
    instituteId: target.instituteId ?? "inst-1",
    permissionOverrides: target.overrides ?? [],
  });
}

function expectNoWrite() {
  expect(prismaMock.userPermission.upsert).not.toHaveBeenCalled();
  expect(prismaMock.userPermission.delete).not.toHaveBeenCalled();
  expect(recordAuditLogMock).not.toHaveBeenCalled();
  expect(notifyMock).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setPermissionOverride guardrails", () => {
  it("blocks actors without the manage permission (role ceiling)", async () => {
    actorHolds(); // admin holds nothing

    const result = await setTeacherPermissionOverride(
      admin,
      "teacher-1",
      PERMISSIONS.GROUP_MANAGE,
      PermissionEffect.DENY,
    );

    expect(result).toEqual({
      ok: false,
      error: "You are not allowed to manage teacher permissions.",
    });
    // Short-circuits before touching the database.
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    expectNoWrite();
  });

  it("rejects cross-tenant / missing targets", async () => {
    actorHolds(PERMISSIONS.TEACHER_PERMISSIONS_MANAGE);
    prismaMock.user.findFirst.mockResolvedValue(null);

    const result = await setTeacherPermissionOverride(
      admin,
      "teacher-x",
      PERMISSIONS.GROUP_MANAGE,
      PermissionEffect.DENY,
    );

    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toContain(
      "not found in this institute",
    );
    // Scoping is always by the actor's institute and the target role.
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "teacher-x",
          instituteId: "inst-1",
          role: Role.TEACHER,
        }),
      }),
    );
    expectNoWrite();
  });

  it("prevents self-lockout", async () => {
    actorHolds(
      PERMISSIONS.TEACHER_PERMISSIONS_MANAGE,
      PERMISSIONS.GROUP_MANAGE,
    );
    mockTarget({ id: admin.id, role: Role.TEACHER });

    const result = await setTeacherPermissionOverride(
      admin,
      admin.id,
      PERMISSIONS.GROUP_MANAGE,
      PermissionEffect.DENY,
    );

    expect(result).toEqual({
      ok: false,
      error: "You cannot change your own permissions.",
    });
    expectNoWrite();
  });

  it("rejects permissions not assignable to the target role", async () => {
    actorHolds(
      PERMISSIONS.TEACHER_PERMISSIONS_MANAGE,
      PERMISSIONS.LEVEL_MANAGE,
    );
    mockTarget({ id: "teacher-1", role: Role.TEACHER });

    const result = await setTeacherPermissionOverride(
      admin,
      "teacher-1",
      PERMISSIONS.LEVEL_MANAGE, // admin-only, not assignable to teachers
      PermissionEffect.ALLOW,
    );

    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toContain(
      "cannot be assigned to teachers",
    );
    expectNoWrite();
  });

  it("enforces the privilege ceiling (cannot grant a permission you lack)", async () => {
    // Admin can manage teachers but does NOT currently hold GROUP_MANAGE.
    actorHolds(PERMISSIONS.TEACHER_PERMISSIONS_MANAGE);
    mockTarget({ id: "teacher-1", role: Role.TEACHER });

    const result = await setTeacherPermissionOverride(
      admin,
      "teacher-1",
      PERMISSIONS.GROUP_MANAGE,
      PermissionEffect.ALLOW,
    );

    expect(result).toEqual({
      ok: false,
      error: "You cannot grant a permission you do not hold.",
    });
    expectNoWrite();
  });
});

describe("setPermissionOverride writes", () => {
  it("persists a DENY override with audit + notification", async () => {
    actorHolds(
      PERMISSIONS.TEACHER_PERMISSIONS_MANAGE,
      PERMISSIONS.GROUP_MANAGE,
    );
    mockTarget({ id: "teacher-1", role: Role.TEACHER });

    const result = await setTeacherPermissionOverride(
      admin,
      "teacher-1",
      PERMISSIONS.GROUP_MANAGE,
      PermissionEffect.DENY,
    );

    expect(result).toEqual({ ok: true });
    expect(prismaMock.userPermission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_permission: {
            userId: "teacher-1",
            permission: PERMISSIONS.GROUP_MANAGE,
          },
        },
        create: expect.objectContaining({
          userId: "teacher-1",
          permission: PERMISSIONS.GROUP_MANAGE,
          effect: PermissionEffect.DENY,
          grantedById: admin.id,
        }),
      }),
    );
    expect(recordAuditLogMock).toHaveBeenCalledTimes(1);
    expect(notifyMock).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when the effect already matches", async () => {
    actorHolds(
      PERMISSIONS.TEACHER_PERMISSIONS_MANAGE,
      PERMISSIONS.GROUP_MANAGE,
    );
    mockTarget({
      id: "teacher-1",
      role: Role.TEACHER,
      overrides: [
        { permission: PERMISSIONS.GROUP_MANAGE, effect: PermissionEffect.DENY },
      ],
    });

    const result = await setTeacherPermissionOverride(
      admin,
      "teacher-1",
      PERMISSIONS.GROUP_MANAGE,
      PermissionEffect.DENY,
    );

    expect(result).toEqual({ ok: true });
    expectNoWrite();
  });

  it("clears an override by deleting the row", async () => {
    actorHolds(
      PERMISSIONS.TEACHER_PERMISSIONS_MANAGE,
      PERMISSIONS.GROUP_MANAGE,
    );
    mockTarget({
      id: "teacher-1",
      role: Role.TEACHER,
      overrides: [
        { permission: PERMISSIONS.GROUP_MANAGE, effect: PermissionEffect.DENY },
      ],
    });

    const result = await setTeacherPermissionOverride(
      admin,
      "teacher-1",
      PERMISSIONS.GROUP_MANAGE,
      null,
    );

    expect(result).toEqual({ ok: true });
    expect(prismaMock.userPermission.delete).toHaveBeenCalledWith({
      where: {
        userId_permission: {
          userId: "teacher-1",
          permission: PERMISSIONS.GROUP_MANAGE,
        },
      },
    });
    expect(recordAuditLogMock).toHaveBeenCalledTimes(1);
  });
});

describe("super admin over admin (wildcard is tunable)", () => {
  it("lets a super admin DENY an admin's default institute permission", async () => {
    // Super admin holds the manage permission; the admin-over bypass means the
    // specific institute permission need not be "held" by the super admin.
    actorHolds(PERMISSIONS.ADMIN_PERMISSIONS_MANAGE);
    mockTarget({ id: "admin-2", role: Role.ADMIN });

    const result = await setInstituteAdminPermissionOverride(
      superAdmin,
      "inst-1",
      "admin-2",
      PERMISSIONS.STUDENT_CREATE, // an ADMIN role default
      PermissionEffect.DENY,
    );

    expect(result).toEqual({ ok: true });
    expect(prismaMock.userPermission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: "admin-2",
          permission: PERMISSIONS.STUDENT_CREATE,
          effect: PermissionEffect.DENY,
          grantedById: superAdmin.id,
        }),
      }),
    );
  });

  it("blocks a non-super actor from managing admins (role ceiling)", async () => {
    actorHolds(); // admin does not hold ADMIN_PERMISSIONS_MANAGE

    const result = await setInstituteAdminPermissionOverride(
      admin,
      "inst-1",
      "admin-2",
      PERMISSIONS.STUDENT_CREATE,
      PermissionEffect.DENY,
    );

    expect(result).toEqual({
      ok: false,
      error: "You are not allowed to manage admin permissions.",
    });
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    expectNoWrite();
  });
});
