import "server-only";

import { readFile } from "fs/promises";
import path from "path";

import sharp from "sharp";

import { prisma } from "@/lib/prisma";
import {
  type InstituteIconSize,
  isInstituteIconSize,
} from "@/lib/institute-manifest";

export type GenerateInstituteIconResult =
  | { ok: true; png: Buffer; etag: string }
  | { ok: false; status: 400 | 404 };

/**
 * Build a square PNG launcher icon from the institute logo.
 * Maskable/home-screen safe: logo fitted inside ~80% of the canvas.
 */
export async function generateInstitutePwaIcon(
  instituteId: string,
  sizeRaw: string,
): Promise<GenerateInstituteIconResult> {
  if (!isInstituteIconSize(sizeRaw)) {
    return { ok: false, status: 400 };
  }

  const size = Number(sizeRaw) as InstituteIconSize;

  const institute = await prisma.institute.findUnique({
    where: { id: instituteId },
    select: { logoUrl: true, updatedAt: true },
  });

  if (!institute?.logoUrl?.trim()) {
    return { ok: false, status: 404 };
  }

  const logoBytes = await fetchLogoBytes(institute.logoUrl.trim());
  if (!logoBytes) {
    return { ok: false, status: 404 };
  }

  // Leave ~10% margin so Android maskable/adaptive icons do not crop the logo.
  const contentSize = Math.round(size * 0.8);
  const resized = await sharp(logoBytes)
    .resize(contentSize, contentSize, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  const png = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 248, g: 247, b: 251, alpha: 1 },
    },
  })
    .composite([{ input: resized, gravity: "centre" }])
    .png()
    .toBuffer();

  const etag = `"${instituteId}-${size}-${institute.updatedAt.getTime()}"`;
  return { ok: true, png, etag };
}

async function fetchLogoBytes(logoUrl: string): Promise<Buffer | null> {
  try {
    if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
      const response = await fetch(logoUrl, { cache: "force-cache" });
      if (!response.ok) return null;
      return Buffer.from(await response.arrayBuffer());
    }

    // Local relative upload paths (dev): `/uploads/institutes/...`
    if (logoUrl.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", logoUrl);
      return readFile(filePath);
    }

    return null;
  } catch {
    return null;
  }
}
