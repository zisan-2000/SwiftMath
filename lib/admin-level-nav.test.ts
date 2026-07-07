import { describe, expect, it } from "vitest";

import { getActiveAdminLevelTab } from "@/lib/admin-level-nav";

describe("getActiveAdminLevelTab", () => {
  const levelId = "lvl_1";

  it("returns overview for the level root", () => {
    expect(getActiveAdminLevelTab(`/admin/levels/${levelId}`, levelId)).toBe(
      "overview",
    );
  });

  it("returns questions for the bank tab", () => {
    expect(
      getActiveAdminLevelTab(`/admin/levels/${levelId}/questions`, levelId),
    ).toBe("questions");
  });

  it("returns settings for the settings tab", () => {
    expect(
      getActiveAdminLevelTab(`/admin/levels/${levelId}/settings`, levelId),
    ).toBe("settings");
  });
});
