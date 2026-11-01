import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: { id: "teacher", instituteId: "institute", role: "TEACHER" },
  permission: vi.fn(),
  allowed: vi.fn(),
  build: vi.fn(),
  scope: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ requirePermission: mocks.permission }));
vi.mock("@/server/permissions", () => ({ can: mocks.allowed }));
vi.mock("@/server/reports", () => ({
  buildPerformanceReport: mocks.build,
  validateReportExportScope: mocks.scope,
}));
import { GET, POST } from "@/app/api/reports/export/route";
import { parseReportFilters, ReportError } from "@/lib/reports";
const url =
  "http://localhost/api/reports/export?scope=group&groupId=a&from=2026-10-01&to=2026-10-31&modules=class&view=both";
describe("report CSV export access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permission.mockResolvedValue(mocks.user);
    mocks.allowed.mockResolvedValue(true);
  });
  it("requires both report view and export capability", async () => {
    mocks.allowed.mockResolvedValue(false);
    expect((await GET(new Request(url))).status).toBe(403);
    expect(mocks.build).not.toHaveBeenCalled();
    mocks.permission.mockRejectedValue(new Error("Unauthenticated"));
    await expect(GET(new Request(url))).rejects.toThrow("Unauthenticated");
  });
  it("rejects malformed filter requests before querying data", async () => {
    expect((await GET(new Request(url + "&from=bad"))).status).toBe(400);
    expect(mocks.build).not.toHaveBeenCalled();
  });
  it("exports from the authenticated actor, with private no-store headers", async () => {
    mocks.build.mockImplementation(async (_actor, filters) => ({
      filters,
      rows: [],
      subjects: [],
      institute: { name: "Institute" },
      subject: "Group A",
      generatedAt: "2026-11-01T00:00:00Z",
    }));
    const response = await GET(new Request(url));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(mocks.build.mock.calls[0][0]).toEqual(mocks.user);
    expect(await response.text()).toContain("Institute");
  });
  const filters = parseReportFilters({
    scope: "group",
    groupId: "a",
    from: "2026-10-01",
    to: "2026-10-31",
    modules: ["class"],
  });
  const request = (body = { ownerId: "teacher", filters }) =>
    new Request(url, { method: "POST", body: JSON.stringify(body) });
  it("rechecks snapshot export permissions and scope without regenerating any scores", async () => {
    mocks.scope.mockResolvedValue(undefined);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.scope).toHaveBeenCalledWith(mocks.user, filters);
    expect(mocks.build).not.toHaveBeenCalled();
  });
  it("blocks snapshot export after a different account signs in or permissions are revoked", async () => {
    expect(
      (await POST(request({ ownerId: "someone-else", filters }))).status,
    ).toBe(403);
    mocks.allowed.mockResolvedValue(false);
    expect((await POST(request())).status).toBe(403);
    expect(mocks.scope).not.toHaveBeenCalled();
  });
  it("blocks stale target access and malformed snapshot requests", async () => {
    mocks.scope.mockRejectedValue(new ReportError("Access changed"));
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Access changed" });
    expect(
      (await POST(new Request(url, { method: "POST", body: "null" }))).status,
    ).toBe(400);
    expect(
      (await POST(new Request(url, { method: "POST", body: "invalid" })))
        .status,
    ).toBe(400);
  });
});
