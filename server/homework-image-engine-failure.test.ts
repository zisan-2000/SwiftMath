import { beforeAll, describe, expect, it, vi } from "vitest";
const context = vi.hoisted(() => ({ loads: 0 }));
vi.mock("server-only", () => ({}));
vi.mock("sharp", () => {
  context.loads++;
  throw new Error("Synthetic ERR_DLOPEN_FAILED: libvips missing");
});
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/session", () => ({ getCurrentUser: async () => null }));
vi.mock("@/server/permissions", () => ({ can: async () => false }));
vi.mock("@vercel/blob", () => ({
  get: async () => ({
    stream: new Response(new Uint8Array([255, 216, 255])).body,
    blob: { contentType: "image/jpeg" },
  }),
}));

describe("homework remains available when native image processing is broken", () => {
  let validation: typeof import("@/server/homework-image-validation");
  beforeAll(async () => {
    validation = await import("@/server/homework-image-validation");
  });
  it("imports homework page services without initializing Sharp", async () => {
    expect((await import("@/server/homework")).getStudentHomework).toBeTypeOf(
      "function",
    );
    expect(
      (await import("@/server/homework-uploads")).homeworkUploadStatus,
    ).toBeTypeOf("function");
    expect(context.loads).toBe(0);
  });
  it("rejects unsupported files without loading the image engine", async () => {
    await expect(
      validation.validateHomeworkImage(Buffer.from("<svg/>")),
    ).rejects.toMatchObject({ code: "IMAGE_FORMAT" });
    expect(context.loads).toBe(0);
  });
  it("still streams existing JPEG photos without Sharp", async () => {
    const { readHomeworkPhoto } = await import("@/server/homework-photos");
    const photo = await readHomeworkPhoto("blob:homework/synthetic.jpg");
    expect(photo?.contentType).toBe("image/jpeg");
    expect(Buffer.from(await new Response(photo!.body).arrayBuffer())).toEqual(
      Buffer.from([255, 216, 255]),
    );
    expect(context.loads).toBe(0);
  });
  it("returns a retryable 503 for processing, rather than accepting an unvalidated image", async () => {
    await expect(
      validation.validateHomeworkImage(Buffer.from([255, 216, 255])),
    ).rejects.toMatchObject({
      code: "IMAGE_PROCESSOR_UNAVAILABLE",
      status: 503,
    });
    expect(context.loads).toBeGreaterThan(0);
  });
  it("returns the same retryable error for HEIC processing", async () => {
    await expect(
      validation.homeworkHeicPreview(Buffer.from("synthetic")),
    ).rejects.toMatchObject({
      code: "IMAGE_PROCESSOR_UNAVAILABLE",
      status: 503,
    });
  });
});
