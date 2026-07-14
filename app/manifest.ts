import type { MetadataRoute } from "next";

import { resolveWebAppManifest } from "@/server/institute-manifest";

/**
 * Dynamic web app manifest (Phase E).
 *
 * Reads the session cookie → institute name / theme / logo when an institute
 * member is signed in. Anonymous and Super Admin get platform defaults.
 * Cached as private/no-store via `next.config.ts` headers.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  return resolveWebAppManifest();
}
