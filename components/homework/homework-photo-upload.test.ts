// @vitest-environment jsdom
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeworkUploadError } from "@/lib/homework-upload";
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  prepare: vi.fn(),
  upload: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@vercel/blob/client", () => ({ upload: mocks.upload }));
vi.mock("@/lib/homework-upload-client", () => ({
  homeworkUploadRequest: mocks.request,
  prepareHomeworkPhoto: mocks.prepare,
  uploadLocalPhoto: vi.fn(),
}));
import { HomeworkPhotoUpload } from "@/components/homework/homework-photo-upload";

describe("homework uploader mobile recovery UI", () => {
  let host: HTMLDivElement, root: Root;
  const ticket = {
    id: "11111111-2222-3333-4444-555555555555",
    pathname: "homework-uploads/test/one.jpg",
    kind: "FIRST",
    byteSize: 5000000,
    sha256: "safehash",
    contentType: "image/jpeg",
    transport: "blob",
    pageNumber: "49",
    completedSubmissionId: null,
    expiresAt: new Date(Date.now() + 600000).toISOString(),
  };
  const key =
    "homework-upload:v1:synthetic-student:FIRST:synthetic-expectation";
  const deferred = () => {
    let resolve!: (v?: unknown) => void;
    const promise = new Promise((r) => (resolve = r));
    return { promise, resolve };
  };
  const mount = async () => {
    await act(async () =>
      root.render(
        createElement(HomeworkPhotoUpload, {
          kind: "FIRST",
          expectationId: "synthetic-expectation",
          studentId: "synthetic-student",
        }),
      ),
    );
  };
  const file = async () => {
    await act(async () => {
      const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
      Object.defineProperty(input, "files", {
        value: [new File(["synthetic"], "photo.jpg", { type: "image/jpeg" })],
      });
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  };
  const submit = async () => {
    await act(async () => {
      host
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
      await new Promise((r) => setTimeout(r, 0));
    });
  };
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    sessionStorage.clear();
    vi.clearAllMocks();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    mocks.prepare.mockResolvedValue({
      file: new File(["synthetic"], "photo.jpg", { type: "image/jpeg" }),
      sha256: ticket.sha256,
    });
    mocks.upload.mockResolvedValue({});
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
  });
  it("disables repeated clicks, shows progress and locks the authorized page during a direct upload", async () => {
    const transfer = deferred();
    mocks.request
      .mockResolvedValueOnce(ticket)
      .mockRejectedValueOnce(
        new HomeworkUploadError("PHOTO_NOT_READY", "Not ready", 409),
      )
      .mockResolvedValue({ submissionId: "saved" });
    mocks.upload.mockImplementation((_path, _file, options) => {
      options.onUploadProgress({ percentage: 45 });
      return transfer.promise;
    });
    await mount();
    await file();
    await submit();
    expect(
      host.querySelector('button[type="submit"]')!.hasAttribute("disabled"),
    ).toBe(true);
    expect(host.textContent).toContain("45%");
    expect(host.querySelector<HTMLInputElement>("input[list]")!.disabled).toBe(
      true,
    );
    await submit();
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.upload.mock.calls[0][2].access).toBe("private");
    expect(
      host.querySelector<HTMLInputElement>('input[type="file"]')!.files,
    ).toHaveLength(1);
    expect(JSON.parse(sessionStorage.getItem(key)!)).toEqual({
      v: 1,
      id: ticket.id,
      reduce: false,
    });
    await act(async () => {
      transfer.resolve();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(host.textContent).toContain("First photo saved. Timer started.");
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem(key)).toBeNull();
  });
  it("recovers a lost upload acknowledgement without transferring the photo twice", async () => {
    mocks.request
      .mockResolvedValueOnce(ticket)
      .mockRejectedValueOnce(
        new HomeworkUploadError("PHOTO_NOT_READY", "Not ready", 409),
      )
      .mockResolvedValue({ submissionId: "saved" });
    mocks.upload.mockRejectedValue(new Error("lost acknowledgement"));
    await mount();
    await file();
    await submit();
    expect(host.textContent).toContain("First photo saved.");
    expect(mocks.upload).toHaveBeenCalledOnce();
  });
  it("restores only the pending ticket after reopen and finalizes an already stored photo without a file", async () => {
    sessionStorage.setItem(key, ticket.id);
    mocks.request
      .mockResolvedValueOnce(ticket)
      .mockResolvedValue({ submissionId: "saved" });
    await mount();
    expect(host.textContent).toContain("previous upload can be recovered");
    await submit();
    expect(host.textContent).toContain("First photo saved.");
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it("retains the recovery ticket and shows sign-in instructions after session expiry", async () => {
    sessionStorage.setItem(key, ticket.id);
    mocks.request
      .mockResolvedValueOnce(ticket)
      .mockRejectedValue(
        new HomeworkUploadError(
          "SESSION_EXPIRED",
          "Sign in again and retry.",
          401,
        ),
      );
    await mount();
    await submit();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      "Sign in again",
    );
    expect(host.querySelector('a[href^="/login"]')).not.toBeNull();
    expect(sessionStorage.getItem(key)).toBe(ticket.id);
  });
  it("explains a partial transfer after reopen and allows choosing another photo/page", async () => {
    sessionStorage.setItem(key, ticket.id);
    mocks.request
      .mockResolvedValueOnce(ticket)
      .mockRejectedValue(
        new HomeworkUploadError("PHOTO_NOT_READY", "Not ready", 409),
      );
    await mount();
    await submit();
    expect(host.textContent).toContain("Select the same photo");
    const change = Array.from(host.querySelectorAll("button")).find(
      (x) => x.textContent === "Change photo / page",
    )!;
    await act(async () => change.click());
    expect(host.querySelector<HTMLInputElement>("input[list]")!.disabled).toBe(
      false,
    );
    expect(sessionStorage.getItem(key)).toBeNull();
  });
  it("restores compression settings so a partial compressed upload can reuse the same original photo", async () => {
    sessionStorage.setItem(
      key,
      JSON.stringify({ v: 1, id: ticket.id, reduce: true }),
    );
    mocks.request
      .mockResolvedValueOnce(ticket)
      .mockRejectedValueOnce(
        new HomeworkUploadError("PHOTO_NOT_READY", "Not ready", 409),
      )
      .mockResolvedValue({ submissionId: "saved" });
    await mount();
    expect(
      host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked,
    ).toBe(true);
    await file();
    await submit();
    expect(mocks.prepare.mock.calls[0][1]).toBe(true);
    expect(host.textContent).toContain("First photo saved.");
  });
  it("allows pausing a slow transfer without losing its recoverable ticket", async () => {
    mocks.request
      .mockResolvedValueOnce(ticket)
      .mockRejectedValueOnce(
        new HomeworkUploadError("PHOTO_NOT_READY", "Not ready", 409),
      );
    mocks.upload.mockImplementation(
      (_path, _file, options) =>
        new Promise((_resolve, reject) =>
          options.abortSignal.addEventListener("abort", () =>
            reject(new DOMException("Stopped", "AbortError")),
          ),
        ),
    );
    await mount();
    await file();
    await submit();
    const pause = Array.from(host.querySelectorAll("button")).find(
      (x) => x.textContent === "Pause upload",
    )!;
    await act(async () => pause.click());
    expect(host.textContent).toContain("Upload paused");
    expect(JSON.parse(sessionStorage.getItem(key)!).id).toBe(ticket.id);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("starts a fresh authorization after a lost authorization response conflicts with edited details", async () => {
    mocks.request
      .mockRejectedValueOnce(
        new HomeworkUploadError("INTENT_CONFLICT", "Start a new upload.", 409),
      )
      .mockResolvedValueOnce(ticket)
      .mockRejectedValueOnce(
        new HomeworkUploadError("PHOTO_NOT_READY", "Not ready", 409),
      )
      .mockResolvedValue({ submissionId: "saved" });
    await mount();
    await file();
    await submit();
    await submit();
    expect(mocks.request.mock.calls[0][1].requestId).not.toBe(
      mocks.request.mock.calls[1][1].requestId,
    );
    expect(host.textContent).toContain("First photo saved.");
  });
});
