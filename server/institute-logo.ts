import "server-only";

import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { put } from "@vercel/blob";

import {
  logoFileExtension,
  validateLogoUploadFile,
} from "@/lib/institute-logo";
import type { AdminContext } from "@/server/admin";

export type UploadInstituteLogoResult =
  | { url: string }
  | { error: string };

/**
 * Store an institute logo and return its public URL.
 * Uses Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set; otherwise writes under
 * `public/uploads/` for local development only.
 */
export async function uploadInstituteLogo(
  admin: AdminContext,
  file: File,
): Promise<UploadInstituteLogoResult> {
  const validationError = validateLogoUploadFile(file);
  if (validationError) return { error: validationError };

  const ext = logoFileExtension(file.type);
  if (!ext) return { error: "Unsupported logo format." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const objectPath = `institutes/${admin.instituteId}/logo-${Date.now()}.${ext}`;
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();

  if (token) {
    const blob = await put(objectPath, buffer, {
      access: "public",
      contentType: file.type,
      token,
    });
    return { url: blob.url };
  }

  if (process.env.NODE_ENV === "production") {
    return {
      error:
        "Logo upload is not configured. Set BLOB_READ_WRITE_TOKEN in production.",
    };
  }

  const dir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "institutes",
    admin.instituteId,
  );
  await mkdir(dir, { recursive: true });
  const filename = `logo-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);

  const baseUrl = (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return {
    url: `${baseUrl}/uploads/institutes/${admin.instituteId}/${filename}`,
  };
}
