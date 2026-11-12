// @vitest-environment jsdom
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PracticeActivityChart } from "@/components/practice-activity-chart";
import { TeacherProgressChart } from "@/components/teacher/teacher-progress-chart";
import { TeacherGroupComparisonChart } from "@/components/teacher/teacher-group-comparison-chart";
import { ClassPerformanceTrendChart } from "@/components/teacher/class-performance-trend-chart";

const charts: [string, () => ReactElement][] = [
  ["practice activity", () => createElement(PracticeActivityChart, { data: [{ date: "2026-11-12", label: "Thu", sessions: 2, passed: 1 }] })],
  ["teacher progress", () => createElement(TeacherProgressChart, { data: [{ date: "2026-11-12", label: "Thu", sessions: 2, passRate: 50, avgAccuracy: 80 }] })],
  ["group comparison", () => createElement(TeacherGroupComparisonChart, { data: [{ groupId: "synthetic", groupName: "Synthetic", sessions: 2, passRate: 50 }] })],
  ["class performance", () => createElement(ClassPerformanceTrendChart, { data: [{ date: "2026-11-12", label: "Thu", averagePercentage: 75 }] })],
];

describe("measured dashboard charts", () => {
  let root: Root;
  let container: HTMLDivElement;
  let width: number, height: number;
  let callbacks: (() => void)[];
  let disconnect: ReturnType<typeof vi.fn>;
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    width = 320; height = 256; callbacks = []; disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { callbacks.push(callback); }
      observe() {}
      unobserve() {}
      disconnect = disconnect;
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const w = this.tagName === "SPAN" ? 16 : width;
      const h = this.tagName === "SPAN" ? 12 : height;
      return { width: w, height: h, x: 0, y: 0, top: 0, left: 0, bottom: h, right: w, toJSON: () => ({}) };
    });
    warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    container = document.createElement("div"); document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount()); container.remove();
    expect(warn).not.toHaveBeenCalled();
    vi.restoreAllMocks(); vi.unstubAllGlobals();
  });

  it.each(charts)("%s SSR reserves accessible layout without negative-size Recharts rendering", (_, chart) => {
    const html = renderToString(chart());
    expect(html).toContain('role="img"');
    expect(html).toContain('h-64 w-full min-w-0');
    expect(html).not.toContain("recharts-surface");
  });
  it.each(charts)("%s mounts with actual mobile dimensions", async (_, chart) => {
    await act(async () => root.render(chart()));
    expect(container.querySelector("div.recharts-wrapper > svg.recharts-surface")?.getAttribute("width")).toBe("320");
    expect(container.querySelector("div.recharts-wrapper > svg.recharts-surface")?.getAttribute("height")).toBe("256");
    expect(container.querySelector('[role="img"]')?.getAttribute("aria-label")).toBeTruthy();
    expect(container.querySelector("div.recharts-wrapper > svg.recharts-surface")?.getAttribute("role")).toBe("application");
  });
  it("resizes after grid layout changes, unmounts while hidden and recovers on reveal", async () => {
    width = 0; height = 0;
    await act(async () => root.render(charts[0][1]()));
    expect(container.querySelector("div.recharts-wrapper > svg.recharts-surface")).toBeNull();
    width = 640; height = 256;
    await act(async () => callbacks.forEach((notify) => notify()));
    expect(container.querySelector("div.recharts-wrapper > svg.recharts-surface")?.getAttribute("width")).toBe("640");
    width = 280;
    await act(async () => callbacks.forEach((notify) => notify()));
    expect(container.querySelector("div.recharts-wrapper > svg.recharts-surface")?.getAttribute("width")).toBe("280");
    width = 0;
    await act(async () => callbacks.forEach((notify) => notify()));
    expect(container.querySelector("div.recharts-wrapper > svg.recharts-surface")).toBeNull();
    width = 360;
    await act(async () => callbacks.forEach((notify) => notify()));
    expect(container.querySelector("div.recharts-wrapper > svg.recharts-surface")?.getAttribute("width")).toBe("360");
  });
  it("keeps existing empty states and does not create a measuring observer", async () => {
    await act(async () => root.render(createElement(PracticeActivityChart, { data: [], empty: true })));
    expect(container.textContent).toContain("No practice sessions yet");
    expect(callbacks).toHaveLength(0);
  });
  it("disconnects observers when navigating away", async () => {
    await act(async () => root.render(charts[0][1]()));
    await act(async () => root.render(null));
    expect(disconnect).toHaveBeenCalled();
  });
  it("retains a window-resize fallback without ResizeObserver", async () => {
    vi.stubGlobal("ResizeObserver", undefined);
    await act(async () => root.render(charts[0][1]()));
    width = 480;
    await act(async () => { window.dispatchEvent(new Event("resize")); });
    expect(container.querySelector("div.recharts-wrapper > svg.recharts-surface")?.getAttribute("width")).toBe("480");
  });
});
