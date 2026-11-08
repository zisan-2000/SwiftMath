// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeacherAssignmentPicker } from "@/components/admin/teacher-assignment-picker";
import { EditGroupForm } from "@/components/admin/edit-group-form";

const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/app/admin/groups/[groupId]/actions", () => ({
  updateGroupAction: mocks.save,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

describe("admin searchable teacher multi-select", () => {
  let root: Root, container: HTMLDivElement;
  const teachers = [
    { id: "a", name: "Sakib", email: "a@school.test" },
    { id: "b", name: "Rakib", email: "b@school.test" },
    { id: "c", name: "Sarkar", email: "c@school.test" },
    { id: "d", name: "Disabled", email: "d@school.test", isActive: false },
  ];
  const values = () =>
    new FormData(container.querySelector("form")!).getAll("teacherIds");
  beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root.render(
        createElement(
          "form",
          null,
          createElement(TeacherAssignmentPicker, {
            teachers,
            defaultTeacherIds: ["b", "d"],
          }),
        ),
      ),
    );
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  async function search(value: string) {
    const input = container.querySelector<HTMLInputElement>(
      'input[type="search"]',
    )!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  it("submits every preselected teacher, including a disabled existing teacher", () => {
    expect(values()).toEqual(["b", "d"]);
    expect(container.textContent).toContain("2 selected");
  });
  it("filters on one letter and keeps hidden selections while adding a teacher", async () => {
    await search("s");
    const names = [...container.querySelectorAll('input[type="checkbox"]')].map(
      (input) => input.closest("label")!.textContent,
    );
    expect(names).toHaveLength(3); // Sakib, Sarkar, Disabled (name contains s)
    expect(names.join(" ")).not.toContain("Rakib");
    const sakib = container.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;
    await act(async () => sakib.click());
    expect(values()).toEqual(["b", "d", "a"]);
  });
  it("supports searching by email prefix, and unassigning everyone", async () => {
    await search("c@");
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(
      1,
    );
    const clear = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Clear all",
    )!;
    await act(async () => clear.click());
    expect(values()).toEqual([]);
    expect(container.textContent).toContain("0 selected");
  });
  it("allows removing a disabled teacher but blocks assigning them again", async () => {
    await search("Disabled");
    const checkbox = container.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;
    expect(checkbox.disabled).toBe(false);
    await act(async () => checkbox.click());
    expect(checkbox.disabled).toBe(true);
    expect(values()).toEqual(["b"]);
  });
  it("keeps an unsaved selection paired with its original revision after server props refresh", async () => {
    const props = {
      groupId: "shared",
      defaultName: "Original",
      defaultTeacherIds: ["a"],
      defaultRevision: 1,
      teachers,
    };
    await act(async () => root.render(createElement(EditGroupForm, props)));
    const name =
      container.querySelector<HTMLInputElement>('input[name="name"]')!;
    name.value = "My unsaved name";
    await act(async () =>
      root.render(
        createElement(EditGroupForm, {
          ...props,
          defaultName: "Other admin saved",
          defaultTeacherIds: ["c"],
          defaultRevision: 2,
        }),
      ),
    );
    expect(name.value).toBe("My unsaved name");
    expect(
      container.querySelector<HTMLInputElement>('input[name="revision"]')!
        .value,
    ).toBe("1");
    expect(values()).toEqual(["a"]);
  });
  it("advances its revision after a successful save without trusting newer unrelated props", async () => {
    mocks.save.mockResolvedValue({ ok: true, revision: 2 });
    await act(async () =>
      root.render(
        createElement(EditGroupForm, {
          groupId: "shared",
          defaultName: "Original",
          defaultTeacherIds: ["a"],
          defaultRevision: 1,
          teachers,
        }),
      ),
    );
    await act(async () => container.querySelector("form")!.requestSubmit());
    expect(mocks.save).toHaveBeenCalled();
    expect(
      container.querySelector<HTMLInputElement>('input[name="revision"]')!
        .value,
    ).toBe("2");
  });
  it("keeps assignments read-only while an authorized admin can still rename the group", async () => {
    await act(async () =>
      root.render(
        createElement(EditGroupForm, {
          groupId: "shared",
          defaultName: "Original",
          defaultTeacherIds: ["a"],
          defaultRevision: 1,
          teachers,
          canAssign: false,
          canManage: true,
        }),
      ),
    );
    expect(container.querySelector("fieldset")!.disabled).toBe(false);
    expect(
      [
        ...container.querySelectorAll<HTMLInputElement>(
          'input[type="checkbox"]',
        ),
      ].every((input) => input.disabled),
    ).toBe(true);
    expect(values()).toEqual(["a"]);
  });
});
