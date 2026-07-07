import { describe, expect, it } from "vitest";

import { getActiveSuperInstituteTab } from "@/lib/super-institute-nav";

describe("getActiveSuperInstituteTab", () => {
  const instituteId = "inst_1";

  it("returns overview for the institute root", () => {
    expect(
      getActiveSuperInstituteTab(`/super/institutes/${instituteId}`, instituteId),
    ).toBe("overview");
  });

  it("returns admins for the admins tab", () => {
    expect(
      getActiveSuperInstituteTab(
        `/super/institutes/${instituteId}/admins`,
        instituteId,
      ),
    ).toBe("admins");
  });

  it("returns settings for the settings tab", () => {
    expect(
      getActiveSuperInstituteTab(
        `/super/institutes/${instituteId}/settings`,
        instituteId,
      ),
    ).toBe("settings");
  });
});
