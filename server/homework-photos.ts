import "server-only";

import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

import { del, get, put } from "@vercel/blob";

const MAX_HOMEWORK_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/heic", "heic"],
]);

export class HomeworkPhotoError extends Error {}

function validate(file: File) {
  if (!file || file.size === 0) throw new HomeworkPhotoError("Choose a homework photo.");
  if (file.size > MAX_HOMEWORK_PHOTO_BYTES) {
    throw new HomeworkPhotoError("Each photo must be 8 MB or smaller.");
  }
  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension) throw new HomeworkPhotoError("Use a JPG, PNG, WebP, or HEIC photo.");
  return extension;
}

export async function storeHomeworkPhoto(
  instituteId: string,
  studentId: string,
  kind: "first" | "final",
  file: File,
) {
  const extension = validate(file);
  const key = `homework/${instituteId}/${studentId}/${Date.now()}-${randomUUID()}-${kind}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    const blob = await put(key, buffer, {
      access: "private",
      contentType: file.type,
      token,
      addRandomSuffix: false,
    });
    return `blob:${blob.pathname}`;
  }
  if (process.env.NODE_ENV === "production") {
    throw new HomeworkPhotoError("Homework photo storage is not configured.");
  }
  const absolute = path.join(process.cwd(), ".data", ...key.split("/"));
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, buffer);
  return `local:${key}`;
}

export async function removeHomeworkPhoto(key: string) {
  try {
    if (key.startsWith("blob:")) {
      await del(key.slice(5), { token: process.env.BLOB_READ_WRITE_TOKEN });
    } else if (key.startsWith("local:")) {
      await unlink(path.join(process.cwd(), ".data", ...key.slice(6).split("/")));
    }
  } catch (error) {
    console.error("[homework-photo] cleanup failed", error);
  }
}

export async function readHomeworkPhoto(key: string) {
  if (key.startsWith("blob:")) {
    const result = await get(key.slice(5), {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result) return null;
    return { body: result.stream, contentType: result.blob.contentType ?? "application/octet-stream" };
  }
  if (!key.startsWith("local:")) return null;
  try {
    const relative = key.slice(6);
    const extension = path.extname(relative).toLowerCase();
    const contentType =
      extension === ".png" ? "image/png" :
      extension === ".webp" ? "image/webp" :
      extension === ".heic" ? "image/heic" : "image/jpeg";
    const body = await readFile(path.join(process.cwd(), ".data", ...relative.split("/")));
    return { body, contentType };
  } catch {
    return null;
  }
}
