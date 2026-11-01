import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  permission: vi.fn(),
  can: vi.fn(),
  build: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ requirePermission: mocks.permission }));
vi.mock("@/server/permissions", () => ({ can: mocks.can }));
vi.mock("@/server/reports", () => ({ buildPerformanceReport: mocks.build }));
import { generatePerformanceReportAction } from "./actions";
import { ReportError } from "@/lib/reports";

describe("interactive report generation", () => {
  const actor = { id: "teacher", instituteId: "institute", role: "TEACHER" };
  function form() {
    const value = new FormData();
    for (const [key, item] of Object.entries({
      scope: "group",
      groupId: "a",
      from: "2026-10-01",
      to: "2026-10-31",
      modules: "class",
    }))
      value.append(key, item);
    return value;
  }
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.permission.mockResolvedValue(actor);
    mocks.can.mockResolvedValue(true);
  });
  it("uses authenticated scope and returns fresh export rights with the preview", async () => {
    mocks.build.mockResolvedValue({ subject: "Group A" });
    expect(await generatePerformanceReportAction(form())).toMatchObject({
      ok: true,
      ownerId: actor.id,
      exportAllowed: true,
      report: { subject: "Group A" },
    });
    expect(mocks.build).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({ groupId: "a", modules: ["class"] }),
    );
  });
  it("returns actionable filter and scope failures without querying or changing records", async () => {
    const invalid = form();
    invalid.delete("groupId");
    expect(await generatePerformanceReportAction(invalid)).toMatchObject({
      ok: false,
      error: "Choose a group.",
    });
    expect(mocks.build).not.toHaveBeenCalled();
    mocks.build.mockRejectedValue(new ReportError("Group is not available."));
    expect(await generatePerformanceReportAction(form())).toMatchObject({
      ok: false,
      error: "Group is not available.",
    });
  });
  it("does not query data without view permission and does not expose unexpected server errors", async () => {
    mocks.permission.mockRejectedValueOnce(new Error("Unauthenticated"));
    await expect(generatePerformanceReportAction(form())).rejects.toThrow(
      "Unauthenticated",
    );
    expect(mocks.build).not.toHaveBeenCalled();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.build.mockRejectedValue(new Error("private database details"));
    expect(await generatePerformanceReportAction(form())).toMatchObject({
      ok: false,
      error: "Unable to generate the report. Please try again.",
    });
    vi.restoreAllMocks();
  });
});
