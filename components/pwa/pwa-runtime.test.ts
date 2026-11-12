// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PwaRuntime } from "./pwa-runtime";
const mocks = vi.hoisted(() => ({
  register: true,
  pathname: "/student",
  installListener: null as null | ((open: boolean) => void),
  track: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("@/lib/pwa", () => ({
  shouldRegisterServiceWorker: () => mocks.register,
}));
vi.mock("@/lib/pwa-analytics", () => ({ trackPwaEvent: mocks.track }));
vi.mock("@/lib/pwa-ui-coordination", () => ({
  subscribeInstallPromptVisibility: (listener: (open: boolean) => void) => {
    mocks.installListener = listener;
    return () => {};
  },
}));
vi.mock("sonner", () => ({ toast: { info: vi.fn() } }));

describe("in-flow PWA update notice", () => {
  let root: Root, container: HTMLDivElement;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    mocks.register = true;
    mocks.pathname = "/student";
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        controller: {},
        ready: Promise.resolve({
          waiting: { postMessage: vi.fn() },
          addEventListener: vi.fn(),
        }),
      },
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    document.getElementById("app-update-notice")?.remove();
    container.remove();
    vi.clearAllMocks();
  });
  it("mounts into the shell slot without a fixed overlay and remains dismissible", async () => {
    const slot = document.createElement("div");
    slot.id = "app-update-notice";
    document.body.append(slot);
    await act(async () => root.render(createElement(PwaRuntime)));
    expect(slot.textContent).toContain("Update available");
    expect(container.textContent).not.toContain("Update available");
    expect(slot.querySelector('[role="status"]')?.className).not.toContain(
      "fixed",
    );
    await act(async () =>
      slot
        .querySelector<HTMLButtonElement>(
          '[aria-label="Dismiss update notice"]',
        )!
        .click(),
    );
    expect(slot.textContent).toBe("");
    expect(mocks.track).toHaveBeenCalledWith("pwa_update_dismiss");
  });
  it("keeps non-shell pages in flow and hides the notice while an install prompt is open", async () => {
    await act(async () => root.render(createElement(PwaRuntime)));
    expect(container.textContent).toContain("Update available");
    expect(container.firstElementChild?.className).not.toContain("fixed");
    await act(async () => mocks.installListener?.(true));
    expect(container.textContent).toBe("");
  });
  it("does not add an update notice when service-worker registration is disabled", async () => {
    mocks.register = false;
    await act(async () => root.render(createElement(PwaRuntime)));
    expect(container.textContent).toBe("");
  });
  it("moves into a late-mounted shell and follows a replacement slot after navigation", async () => {
    await act(async () => root.render(createElement(PwaRuntime)));
    expect(container.textContent).toContain("Update available");
    const first = document.createElement("div");
    first.id = "app-update-notice";
    await act(async () => {
      document.body.append(first);
    });
    expect(first.textContent).toContain("Update available");
    expect(container.textContent).toBe("");
    const next = document.createElement("div");
    next.id = "app-update-notice";
    await act(async () => {
      first.remove();
      document.body.append(next);
    });
    expect(next.textContent).toContain("Update available");
    expect(first.textContent).toBe("");
  });
});
