import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  homeworkUploadRequest,
  prepareHomeworkPhoto,
} from "@/lib/homework-upload-client";

afterEach(() => vi.unstubAllGlobals());
describe("mobile homework uploader request handling", () => {
  it("sniffs Android empty/wrong MIME, preserves original bytes and hashes exact content", async () => {
    const bytes = await sharp({
      create: { width: 120, height: 90, channels: 3, background: "#fff" },
    })
      .jpeg()
      .toBuffer();
    for (const type of ["", "application/octet-stream", "image/png"]) {
      const prepared = await prepareHomeworkPhoto(
        new File([new Uint8Array(bytes)], "camera.unknown", { type }),
        false,
      );
      expect(prepared.file.type).toBe("image/jpeg");
      expect(prepared.sha256).toBe(
        createHash("sha256").update(bytes).digest("hex"),
      );
      expect(Buffer.from(await prepared.file.arrayBuffer()).equals(bytes)).toBe(
        true,
      );
    }
  });
  it("accepts true HEIF headers despite an inconsistent browser MIME", async () => {
    const bytes = new Uint8Array(64);
    bytes.set(new TextEncoder().encode("ftypmif1"), 4);
    expect(
      (
        await prepareHomeworkPhoto(
          new File([bytes], "camera.heif", { type: "image/heif" }),
          false,
        )
      ).file.type,
    ).toBe("image/heic");
  });
  it("keeps compression optional and explains unsupported browser compression", async () => {
    const bytes = await sharp({
      create: { width: 32, height: 32, channels: 3, background: "#fff" },
    })
      .jpeg()
      .toBuffer();
    await expect(
      prepareHomeworkPhoto(new File([new Uint8Array(bytes)], "a.jpg"), true),
    ).rejects.toMatchObject({ code: "IMAGE_COMPRESSION" });
  });
  it.each([401, 403, 413, 429, 500, 503])(
    "turns HTTP %i into an actionable error without crashing the page",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            Response.json(
              { code: "TEST_FAILURE", error: "Safe message" },
              { status },
            ),
          ),
      );
      await expect(
        homeworkUploadRequest("/api/student/homework/uploads", {}),
      ).rejects.toMatchObject({ status, message: "Safe message" });
    },
  );
  it("detects expired-session HTML responses and redirects", async () => {
    const response = new Response("Login page", {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
    Object.defineProperty(response, "redirected", { value: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(homeworkUploadRequest("/test", {})).rejects.toMatchObject({
      code: "SESSION_EXPIRED",
      status: 401,
    });
  });
  it("sends metadata JSON only, with no photo or FormData in finalization", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ submissionId: "synthetic" }));
    vi.stubGlobal("fetch", fetcher);
    await homeworkUploadRequest("/api/student/homework/uploads/example", {});
    expect(fetcher.mock.calls[0][1].body).toBe("{}");
    expect(fetcher.mock.calls[0][1].cache).toBe("no-store");
  });
  it("uses opt-in 2400px / JPEG 94% compression, reports exact bytes and releases the bitmap", async () => {
    const jpeg = await sharp({
      create: { width: 32, height: 32, channels: 3, background: "#fff" },
    })
      .jpeg()
      .toBuffer();
    const bitmap = { width: 4000, height: 3000, close: vi.fn() },
      context = { fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: "" };
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => context,
      toBlob: vi.fn((callback: (blob: Blob) => void) =>
        callback(new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" })),
      ),
    };
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    vi.stubGlobal("document", { createElement: () => canvas });
    const result = await prepareHomeworkPhoto(
      new File([new Uint8Array(jpeg), new Uint8Array(10000)], "camera.jpg", {
        type: "image/jpeg",
      }),
      true,
    );
    expect(canvas.width).toBe(2400);
    expect(canvas.height).toBe(1800);
    expect(canvas.toBlob.mock.calls[0]).toEqual([
      expect.any(Function),
      "image/jpeg",
      0.94,
    ]);
    expect(result.file.size).toBe(jpeg.length);
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
});
