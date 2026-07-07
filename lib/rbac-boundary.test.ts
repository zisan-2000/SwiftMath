import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { Role } from "@/lib/generated/prisma/enums";
import { PERMISSIONS, getRoleDefaultPermissions } from "@/lib/permissions";

const ACTION_OR_ROUTE_FILE = /(?:actions|route)\.tsx?$/;

function collectFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return collectFiles(path);
    return ACTION_OR_ROUTE_FILE.test(entry) ? [path] : [];
  });
}

/**
 * Catalog KEY names (e.g. "GROUP_MANAGE") a TEACHER holds by role default.
 * These are the permissions a lower role could use to escalate through an
 * institute-wide admin action that only checks the shared capability.
 */
function teacherHoldablePermissionKeys(): string[] {
  const teacherDefaults = getRoleDefaultPermissions(Role.TEACHER);
  return Object.entries(PERMISSIONS)
    .filter(([, value]) => teacherDefaults.has(value))
    .map(([key]) => key);
}

describe("RBAC mutation boundaries", () => {
  it("keeps server actions and route handlers on permission guards", () => {
    const files = collectFiles(join(process.cwd(), "app"));
    const roleGuardFiles = files.filter((file) => {
      const source = readFileSync(file, "utf8");
      return (
        source.includes("requireRole(") ||
        source.includes("requireSuperAdmin(")
      );
    });

    expect(roleGuardFiles.map((file) => relative(process.cwd(), file))).toEqual(
      [],
    );
  });

  it("guards institute-wide admin mutations against lower-role escalation", () => {
    // Admin actions/routes are directly-callable POST endpoints. When their
    // capability permission is ALSO held by a TEACHER, a plain
    // requirePermission() would let that teacher invoke the wider-scoped admin
    // action (which scopes only by instituteId, not by the caller's role or
    // ownership). Such boundaries MUST use requireAdminPermission() so the role
    // backstop blocks lower roles even when they hold the shared capability.
    const adminFiles = collectFiles(join(process.cwd(), "app", "admin"));
    const teacherKeys = teacherHoldablePermissionKeys();

    const offenders: string[] = [];
    for (const file of adminFiles) {
      const source = readFileSync(file, "utf8");
      for (const key of teacherKeys) {
        // Note: `requirePermission(PERMISSIONS.X)` is intentionally distinct
        // from `requireAdminPermission(PERMISSIONS.X)` — the substring below
        // does not match the admin-guarded form.
        if (source.includes(`requirePermission(PERMISSIONS.${key})`)) {
          offenders.push(`${relative(process.cwd(), file)} → ${key}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
