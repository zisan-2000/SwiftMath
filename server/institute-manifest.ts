import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getCurrentUser } from "@/lib/session";
import {
  buildWebAppManifest,
  type InstituteManifestBrand,
} from "@/lib/institute-manifest";
import type { MetadataRoute } from "next";

/**
 * Resolve the signed-in user's institute branding for the web app manifest.
 * Super Admin and anonymous visitors return null → platform defaults.
 */
export const loadManifestInstituteBrand = cache(
  async (): Promise<{
    institute: InstituteManifestBrand | null;
    role: Role | null;
  }> => {
    const user = await getCurrentUser();
    if (!user || user.role === Role.SUPER_ADMIN) {
      return { institute: null, role: user?.role ?? null };
    }

    const institute = await prisma.institute.findUnique({
      where: { id: user.instituteId },
      select: {
        id: true,
        name: true,
        tagline: true,
        logoUrl: true,
        primaryColor: true,
      },
    });

    return {
      institute: institute ?? null,
      role: user.role,
    };
  },
);

/** Session-aware installable web app manifest. */
export async function resolveWebAppManifest(): Promise<MetadataRoute.Manifest> {
  const { institute, role } = await loadManifestInstituteBrand();
  return buildWebAppManifest({ institute, role });
}
