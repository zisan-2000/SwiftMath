import { describe, expect, it } from "vitest";

import { getActiveAdminGroupTab } from "@/lib/admin-group-nav";

describe("getActiveAdminGroupTab", () => {
  const groupId = "grp_1";

  it("returns overview for the group root", () => {
    expect(getActiveAdminGroupTab(`/admin/groups/${groupId}`, groupId)).toBe(
      "overview",
    );
  });

  it("returns students for the students tab", () => {
    expect(
      getActiveAdminGroupTab(`/admin/groups/${groupId}/students`, groupId),
    ).toBe("students");
  });

  it("returns settings for the settings tab", () => {
    expect(
      getActiveAdminGroupTab(`/admin/groups/${groupId}/settings`, groupId),
    ).toBe("settings");
  });
});
