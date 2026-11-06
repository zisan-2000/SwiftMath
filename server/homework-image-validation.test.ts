import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  homeworkPhotoType,
  MAX_HOMEWORK_PHOTO_BYTES,
} from "@/lib/homework-upload";
vi.mock("server-only", () => ({}));
import {
  homeworkHeicPreview,
  validateHomeworkImage,
} from "@/server/homework-image-validation";

describe("homework image byte and decoder validation", () => {
  const image = () =>
    sharp({
      create: { width: 160, height: 120, channels: 3, background: "#fafafa" },
    });
  it.each(["jpeg", "png", "webp"] as const)(
    "fully decodes %s and detects contents independently of MIME/name",
    async (format) => {
      const bytes = await image()[format]().toBuffer();
      expect(await validateHomeworkImage(bytes)).toBe(`image/${format}`);
      expect(homeworkPhotoType(bytes)).toBe(`image/${format}`);
    },
  );
  it("accepts 8 MiB and rejects 8 MiB plus one byte", async () => {
    const bytes = await image().jpeg().toBuffer(),
      padded = Buffer.concat([
        bytes,
        Buffer.alloc(MAX_HOMEWORK_PHOTO_BYTES - bytes.length),
      ]);
    expect(await validateHomeworkImage(padded)).toBe("image/jpeg");
    await expect(
      validateHomeworkImage(Buffer.concat([padded, Buffer.alloc(1)])),
    ).rejects.toMatchObject({ code: "IMAGE_SIZE" });
  });
  it.each([
    Buffer.alloc(0),
    Buffer.from("<svg/>"),
    Buffer.from("%PDF"),
    Buffer.from("GIF89a"),
  ])("rejects empty/unsupported bytes %#", async (bytes) => {
    await expect(validateHomeworkImage(bytes)).rejects.toThrow();
  });
  it.each([
    Buffer.from([255, 216, 255, 0, 0, 0]),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    Buffer.from("RIFF0000WEBP0000"),
  ])("rejects spoofed or truncated image headers %#", async (bytes) => {
    await expect(validateHomeworkImage(bytes)).rejects.toMatchObject({
      code: "IMAGE_INVALID",
    });
  });
  it("bounds decompression before a huge bitmap is decoded", async () => {
    const bytes = await sharp({
      create: { width: 6500, height: 6500, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    await expect(validateHomeworkImage(bytes)).rejects.toThrow();
  });
  it("rejects malformed HEIC with a friendly error", async () => {
    const bytes = Buffer.alloc(32);
    bytes.write("ftypheic", 4);
    await expect(validateHomeworkImage(bytes)).rejects.toMatchObject({
      code: "IMAGE_INVALID",
    });
  });
  it("decodes a genuine synthetic HEIC and renders a JPEG private preview", async () => {
    const bytes = await readFile(
      new URL("../test/fixtures/homework-synthetic.heic", import.meta.url),
    );
    expect(await validateHomeworkImage(bytes)).toBe("image/heic");
    const preview = await homeworkHeicPreview(bytes),
      meta = await sharp(preview).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(160);
    expect(meta.height).toBe(120);
  });
});
