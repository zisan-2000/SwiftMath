// @vitest-environment jsdom
import { Blob as NodeBlob } from "node:buffer";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportFiltersForm } from "./report-filters";
import { ReportDocument } from "./report-document";
import { ReportWorkspace } from "./report-workspace";
import { parseReportFilters, reportToCsv } from "@/lib/reports";
import type { PerformanceReport } from "@/server/reports";

const mocks = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@/app/reports/actions", () => ({
  generatePerformanceReportAction: mocks.generate,
}));
const options = {
  groups: [
    { id: "a", name: "Group A" },
    { id: "b", name: "Group B" },
  ],
  students: [
    { id: "rafi", name: "Rafi", contactNumber: "01712345678", groupId: "a" },
    { id: "sakib", name: "Sakib", contactNumber: "01812345678", groupId: "a" },
  ],
  levels: [],
};
const query = {
  scope: "group",
  groupId: "a",
  from: "2026-10-01",
  to: "2026-10-31",
  modules: ["class", "homework"],
  view: "both",
  generate: "1",
};
function fixture(count = 1): PerformanceReport {
  return {
    filters: parseReportFilters(query),
    institute: { name: "Test Institute", logoUrl: null },
    subject: "Group A",
    levelName: null,
    generatedAt: "2026-11-01T10:00:00Z",
    subjects: [{ id: "rafi", name: "Rafi" }],
    rows: Array.from({ length: count }, (_, index) => ({
      id: `entry-${index}`,
      studentId: "rafi",
      student: "Rafi",
      module: "class",
      date: "2026-10-25",
      group: "A",
      label: `Class ${index}`,
      status: "PRESENT",
      mark: 9,
      maximum: 10,
    })),
  };
}

describe("report UX regression", () => {
  let host: HTMLDivElement, root: Root;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    mocks.generate.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  const input = async (selector: string, value: string) =>
    act(async () => {
      const element = host.querySelector<HTMLInputElement>(selector)!;
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });
  const select = async (selector: string, value: string) =>
    act(async () => {
      const element = host.querySelector<HTMLSelectElement>(selector)!;
      element.value = value;
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
  const button = (text: string) =>
    Array.from(host.querySelectorAll("button")).find((item) =>
      item.textContent?.includes(text),
    )!;
  const workspace = async (report = fixture()) =>
    act(async () =>
      root.render(
        createElement(ReportWorkspace, {
          options,
          query,
          basePath: "/teacher/reports",
          initialReport: report,
          initialError: null,
          ownerId: "teacher",
          exportAllowed: true,
        }),
      ),
    );
  const submit = async () =>
    act(async () => {
      host
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });

  it("submits sections/dates and only the active group or student scope", async () => {
    await act(async () =>
      root.render(
        createElement(ReportFiltersForm, {
          options,
          query,
          basePath: "/teacher/reports",
        }),
      ),
    );
    const data = new FormData(host.querySelector("form")!);
    expect(data.getAll("modules")).toEqual(["class", "homework"]);
    expect(data.get("from")).toBe("2026-10-01");
    await select('[name="scope"]', "student");
    expect(host.querySelector('[name="groupId"]')).toBeNull();
    expect(host.querySelector('[name="studentId"]')).not.toBeNull();
  });
  it("searches names/phone immediately, selects by keyboard and clears the old target when typing again", async () => {
    await act(async () =>
      root.render(
        createElement(ReportFiltersForm, {
          options,
          query: { ...query, scope: "student", studentId: "sakib" },
          basePath: "/teacher/reports",
        }),
      ),
    );
    await input('[role="combobox"]', "017");
    expect(host.querySelector('[role="listbox"]')!.textContent).toContain(
      "Rafi",
    );
    expect(host.querySelector('[role="listbox"]')!.textContent).not.toContain(
      "Sakib",
    );
    expect(new FormData(host.querySelector("form")!).get("studentId")).toBe("");
    await act(async () => {
      host.querySelector('[role="combobox"]')!.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(new FormData(host.querySelector("form")!).get("studentId")).toBe(
      "rafi",
    );
    await input('[role="combobox"]', "sa");
    expect(host.querySelector('[role="listbox"]')!.textContent).toContain(
      "Sakib",
    );
    expect(new FormData(host.querySelector("form")!).get("studentId")).toBe("");
    await input('[role="combobox"]', "xyz");
    expect(host.textContent).toContain("No matching students");
  });
  it("removes irrelevant filters from the visible form and submitted data", async () => {
    await workspace();
    expect(host.querySelector('[name="homeworkStatus"]')).not.toBeNull();
    expect(host.querySelector('[name="levelId"]')).toBeNull();
    await act(async () =>
      host
        .querySelector<HTMLInputElement>('[name="modules"][value="homework"]')!
        .click(),
    );
    expect(host.querySelector('[name="homeworkStatus"]')).toBeNull();
    expect(new FormData(host.querySelector("form")!).has("page")).toBe(false);
    await act(async () =>
      host
        .querySelector<HTMLInputElement>('[name="modules"][value="practice"]')!
        .click(),
    );
    expect(host.querySelector('[name="practiceMode"]')).not.toBeNull();
    expect(host.querySelector('[name="levelId"]')).not.toBeNull();
  });
  it("locks PDF/CSV after a filter edit, labels the old preview and unlocks when reverted", async () => {
    await workspace();
    expect(button("Download CSV").disabled).toBe(false);
    await select('[name="groupId"]', "b");
    expect(host.textContent).toContain("Filters changed. Generate");
    expect(host.querySelector("article h3")!.textContent).toContain("Group A");
    expect(button("Download CSV").disabled).toBe(true);
    expect(button("Print / Save PDF").disabled).toBe(true);
    expect(
      host
        .querySelector("[data-report-blocked]")!
        .getAttribute("data-report-blocked"),
    ).toBe("true");
    await select('[name="groupId"]', "a");
    expect(button("Download CSV").disabled).toBe(false);
  });
  it("shows generation progress, prevents duplicate submit and focuses the new result", async () => {
    let resolve!: (value: unknown) => void;
    mocks.generate.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await workspace();
    await select('[name="groupId"]', "b");
    await submit();
    expect(host.textContent).toContain("Generating report…");
    expect(button("Download CSV").disabled).toBe(true);
    expect(
      host.querySelector<HTMLFieldSetElement>("form > fieldset")!.disabled,
    ).toBe(true);
    await submit();
    expect(mocks.generate).toHaveBeenCalledOnce();
    const next = {
      ...fixture(),
      subject: "Group B",
      filters: { ...fixture().filters, groupId: "b" },
    };
    await act(async () =>
      resolve({
        ok: true,
        report: next,
        ownerId: "teacher",
        exportAllowed: true,
      }),
    );
    expect(host.querySelector("article h3")!.textContent).toContain("Group B");
    expect(host.textContent).toContain("Report ready");
    expect(document.activeElement?.getAttribute("tabindex")).toBe("-1");
    expect(button("Download CSV").disabled).toBe(false);
    expect(window.location.search).toContain("groupId=b");
  });
  it("shows generation errors near the result and allows retry", async () => {
    await workspace();
    mocks.generate.mockResolvedValue({
      ok: false,
      error: "Report too large. Narrow the dates.",
    });
    await submit();
    expect(host.querySelector('[role="alert"]')!.textContent).toContain(
      "Narrow the dates",
    );
    expect(button("Download CSV").disabled).toBe(true);
    mocks.generate.mockResolvedValue({
      ok: true,
      report: fixture(),
      ownerId: "teacher",
      exportAllowed: true,
    });
    await submit();
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(button("Download CSV").disabled).toBe(false);
  });
  it("resets the actual filters and preview even after a client-side generation updated the URL", async () => {
    await workspace();
    await select('[name="groupId"]', "b");
    mocks.generate.mockResolvedValue({
      ok: true,
      report: {
        ...fixture(),
        subject: "Group B",
        filters: { ...fixture().filters, groupId: "b" },
      },
      ownerId: "teacher",
      exportAllowed: true,
    });
    await submit();
    expect(window.location.search).toContain("groupId=b");
    await act(async () => button("Reset").click());
    expect(host.querySelector("article")).toBeNull();
    expect(
      host.querySelector<HTMLSelectElement>('[name="groupId"]')!.value,
    ).toBe("");
    expect(host.querySelector('[name="homeworkStatus"]')).not.toBeNull();
    expect(window.location.search).toBe("");
    expect(host.textContent).toContain("Choose your filters");
    expect(host.textContent).not.toContain("Report ready");
  });
  it("paginates date-wise rows on screen, but renders every row during native print", async () => {
    await workspace(fixture(60));
    const details = () => host.querySelectorAll("article table")[1];
    expect(details().querySelectorAll("tbody tr")).toHaveLength(25);
    await act(async () => button("Next").click());
    expect(details().textContent).toContain("Class 25");
    expect(details().textContent).not.toContain("Class 0");
    await act(async () => window.dispatchEvent(new Event("beforeprint")));
    expect(details().querySelectorAll("tbody tr")).toHaveLength(60);
    await act(async () => window.dispatchEvent(new Event("afterprint")));
    expect(details().querySelectorAll("tbody tr")).toHaveLength(25);
  });
  it("does not expand a stale report for native print", async () => {
    await workspace(fixture(60));
    await select('[name="groupId"]', "b");
    await act(async () => window.dispatchEvent(new Event("beforeprint")));
    expect(
      host.querySelectorAll("article table")[1].querySelectorAll("tbody tr"),
    ).toHaveLength(25);
    expect(host.querySelector('[data-report-blocked="true"]')).not.toBeNull();
  });
  it("prepares all rows and opens native Print / Save PDF after fresh export authorization", async () => {
    await workspace(fixture(60));
    const print = vi.spyOn(window, "print").mockImplementation(() => {
      expect(
        host.querySelectorAll("article table")[1].querySelectorAll("tbody tr"),
      ).toHaveLength(60);
    });
    await act(async () => button("Print / Save PDF").click());
    expect(fetch).toHaveBeenCalledWith(
      "/api/reports/export",
      expect.objectContaining({ method: "POST" }),
    );
    expect(print).toHaveBeenCalledOnce();
    expect(
      host.querySelectorAll("article table")[1].querySelectorAll("tbody tr"),
    ).toHaveLength(25);
  });
  it("downloads all CSV rows from the exact preview snapshot without rebuilding current DB scores", async () => {
    vi.stubGlobal("Blob", NodeBlob);
    const create = vi.fn().mockReturnValue("blob:report");
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: create,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined,
    );
    const report = fixture(60);
    await workspace(report);
    await act(async () => button("Download CSV").click());
    const file = create.mock.calls[0][0] as NodeBlob;
    const downloaded = await file.text();
    expect(Buffer.from(await file.arrayBuffer())).toEqual(
      Buffer.from(
        reportToCsv(
          report.rows,
          report.filters,
          report.generatedAt,
          report.subjects,
          { institute: report.institute.name, subject: report.subject },
        ),
        "utf8",
      ),
    );
    expect(downloaded).toContain("Class 59");
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("shows denied-export errors, without printing or silently switching datasets", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Access changed. Regenerate." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await workspace();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    await act(async () => button("Print / Save PDF").click());
    expect(host.querySelector('[role="alert"]')!.textContent).toContain(
      "Access changed",
    );
    expect(print).not.toHaveBeenCalled();
    expect(button("Print / Save PDF").disabled).toBe(false);
  });
  it("keeps mobile summaries compact, shows status badges and prints calculation rules", async () => {
    await act(async () =>
      root.render(
        createElement(ReportDocument, { report: fixture(), printing: true }),
      ),
    );
    expect(host.querySelector(".report-mobile-summaries")).toBeNull();
    expect(
      host.querySelector(".report-calculation-notes")!.hasAttribute("open"),
    ).toBe(true);
    expect(host.textContent).toContain("PRESENT");
    expect(host.textContent).toContain("No combined overall score");
  });
});
