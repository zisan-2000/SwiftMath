// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassPerformanceEntryForm } from "@/components/teacher/class-performance-entry-form";

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() },
  action: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/app/teacher/groups/[groupId]/performance/actions", () => ({
  saveClassPerformanceAction: mocks.action,
}));

describe("Class performance form date and revision regression", () => {
  let root: Root;
  let container: HTMLDivElement;
  let groupId: string;
  let counter = 0;
  const props = (date = "2026-10-25", marks = ["9", "8.5"], revision = 1) => ({
    groupId,
    selectedDate: date,
    maximumMark: "10",
    sheetId: `sheet-${date}`,
    revision,
    isExisting: true,
    students: ["Rafi", "Sakib"].map((name, i) => ({
      id: name,
      name,
      mark: marks[i],
      status: "PRESENT" as const,
      canBeNotEntered: false,
    })),
  });
  type Props = ReturnType<typeof props>;
  const render = async (p: Props) => {
    await act(async () =>
      root.render(
        createElement(ClassPerformanceEntryForm, {
          key: `${p.groupId}:${p.selectedDate}`,
          ...p,
        }),
      ),
    );
  };
  const input = (name: string) =>
    container.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
  const change = async (element: HTMLInputElement, value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
  };
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    groupId = `ui-regression-${++counter}`;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(false);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it("uses one in-card date picker to load A-B-A while keeping the submitted date locked", async () => {
    await render(props());
    expect(container.querySelectorAll('input[type="date"]')).toHaveLength(1);
    expect(input("classDate").type).toBe("hidden");
    const picker = () =>
      container.querySelector<HTMLInputElement>("#class-performance-date")!;
    expect(picker().closest("form")).not.toBeNull();
    expect(picker().readOnly).toBe(false);
    await change(picker(), "2026-10-26");
    expect(mocks.router.push).toHaveBeenCalledWith(
      `/teacher/groups/${groupId}/performance?date=2026-10-26`,
    );
    expect(input("classDate").value).toBe("2026-10-25");
    const submitted = new FormData(container.querySelector("form")!);
    expect(submitted.get("sheetId")).toBe("sheet-2026-10-25");
    expect(submitted.get("classDate")).toBe("2026-10-25");
    expect(mocks.action).not.toHaveBeenCalled();
    await render(props("2026-10-26", ["2", "3"]));
    expect(input("mark:Rafi").value).toBe("2");
    await change(picker(), "2026-10-25");
    await render(props());
    expect(input("mark:Rafi").value).toBe("9");
  });

  it("fresh server revision replaces clean marks, maximum and attendance", async () => {
    await render(props());
    const fresh = props("2026-10-25", ["76", "87"], 2);
    fresh.maximumMark = "100";
    await render(fresh);
    expect(input("mark:Rafi").value).toBe("76");
    expect(input("maximumMark").value).toBe("100");
    expect(input("revision").value).toBe("2");
  });

  it("keeps a dirty draft on refresh and blocks saving until latest is explicitly loaded", async () => {
    await render(props());
    await change(input("mark:Rafi"), "7");
    await render(props("2026-10-25", ["4", "5"], 2));
    expect(input("mark:Rafi").value).toBe("7");
    expect(input("revision").value).toBe("1");
    expect(container.textContent).toContain("draft is preserved");
    expect(container.querySelector("fieldset")!.disabled).toBe(true);
    vi.mocked(window.confirm).mockReturnValue(true);
    const reload = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "Load latest record",
    )!;
    await act(async () => reload.click());
    expect(input("mark:Rafi").value).toBe("4");
    expect(input("revision").value).toBe("2");
    expect(container.querySelector("fieldset")!.disabled).toBe(false);
  });

  it("cancelled date navigation preserves marks and does not navigate", async () => {
    await render(props());
    await change(input("mark:Rafi"), "7");
    await change(
      container.querySelector("#class-performance-date")!,
      "2026-10-26",
    );
    expect(window.confirm).toHaveBeenCalled();
    expect(mocks.router.push).not.toHaveBeenCalled();
    expect(input("mark:Rafi").value).toBe("7");
    expect(
      container.querySelector<HTMLInputElement>("#class-performance-date")!
        .value,
    ).toBe("2026-10-25");
  });

  it("new date starts a separate create draft with reset maximum, marks and attendance", async () => {
    await render(props());
    await render({
      ...props("2026-10-26", ["0", "0"]),
      sheetId: null,
      revision: null,
      isExisting: false,
    } as unknown as Props);
    const data = new FormData(container.querySelector("form")!);
    expect(data.get("mode")).toBe("create");
    expect(data.get("sheetId")).toBe("");
    expect(data.get("revision")).toBe("");
    expect(data.get("mark:Rafi")).toBe("0");
    expect(data.get("status:Rafi")).toBe("PRESENT");
  });

  it("same-tab Back/Forward remount restores an unsaved draft instead of losing it", async () => {
    await render(props());
    await change(input("mark:Rafi"), "6");
    await act(async () => root.render(null));
    await render(props());
    expect(input("mark:Rafi").value).toBe("6");
    expect(container.textContent).toContain("Unsaved changes");
    expect(container.querySelector("fieldset")!.disabled).toBe(false);
  });

  it("submits the locked sheet identity and refreshes after a successful save", async () => {
    mocks.action.mockResolvedValue({
      ok: true,
      message: "Saved",
      savedDate: "2026-10-25",
      sheetId: "sheet-2026-10-25",
      revision: 2,
    });
    await render(props());
    await change(input("mark:Rafi"), "7");
    await act(async () => {
      container
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(mocks.action).toHaveBeenCalled();
    const data = mocks.action.mock.calls[0][1] as FormData;
    expect(data.get("mode")).toBe("update");
    expect(data.get("revision")).toBe("1");
    expect(data.get("sheetId")).toBe("sheet-2026-10-25");
    expect(data.get("mark:Rafi")).toBe("7");
    expect(mocks.router.refresh).toHaveBeenCalled();
    await render(props("2026-10-25", ["7", "8.5"], 2));
    expect(input("mark:Rafi").value).toBe("7");
    expect(input("revision").value).toBe("2");
  });

  it("conflict keeps unsaved marks and shows the server error", async () => {
    mocks.action.mockResolvedValue({
      message: "Another editor saved this class. Reload the latest record.",
    });
    await render(props());
    await change(input("mark:Rafi"), "7");
    await act(async () => {
      container
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(input("mark:Rafi").value).toBe("7");
    expect(container.textContent).toContain("Another editor");
    expect(mocks.router.refresh).not.toHaveBeenCalled();
  });
});
