// Shared institute branding fetch for authenticated area page loaders.

import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

export interface InstituteBranding {
  name: string;
  logoUrl: string | null;
}

/** White-label institute row for AppShell chrome. */
export const loadInstituteBranding = cache(
  async (instituteId: string): Promise<InstituteBranding | null> => {
    return prisma.institute.findUnique({
      where: { id: instituteId },
      select: { name: true, logoUrl: true },
    });
  },
);
