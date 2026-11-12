// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ManagementWorkspace } from "./management-workspace";

describe("admin management tool workspace", () => {
  let root: Root, container: HTMLDivElement;
  beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root.render(
        createElement(ManagementWorkspace, {
          teachers: 2,
          students: 10,
          groups: 3,
          levels: 4,
          academicLevels: 2,
          canViewReports: false,
        }),
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
  it("shows actual scoped counts and excludes an unauthorized report tool", () => {
    expect(
      container.querySelector('a[href="/admin/students"]')?.textContent,
    ).toContain("10");
    expect(container.querySelector('a[href="/admin/reports"]')).toBeNull();
  });
  it("filters destinations by category without leaving the dashboard", async () => {
    const curriculum = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Curriculum",
    )!;
    await act(async () => curriculum.click());
    expect(curriculum.getAttribute("aria-pressed")).toBe("true");
    expect(
      [...container.querySelectorAll("a")].map((link) =>
        link.getAttribute("href"),
      ),
    ).toEqual(["/admin/levels", "/admin/academic-levels"]);
  });
  it("supports one-letter tool search and useful route keywords", async () => {
    await search("t");
    expect(container.querySelectorAll("a").length).toBeGreaterThan(0);
    await search("staff");
    expect(container.querySelectorAll("a")).toHaveLength(1);
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "/admin/teachers",
    );
  });
  it("announces no matches and can reset both filters", async () => {
    await search("no-such-tool");
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "0 management tools",
    );
    expect(container.textContent).toContain("No matching tools");
    await act(async () =>
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent === "Clear filters")!
        .click(),
    );
    expect(container.querySelectorAll("a")).toHaveLength(6);
    expect(container.querySelector<HTMLInputElement>("input")!.value).toBe("");
  });
});
