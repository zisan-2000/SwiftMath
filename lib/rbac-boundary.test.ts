import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const ACTION_OR_ROUTE_FILE = /(?:actions|route)\.tsx?$/;

function collectFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return collectFiles(path);
    return ACTION_OR_ROUTE_FILE.test(entry) ? [path] : [];
  });
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
});
