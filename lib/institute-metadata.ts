// Per-institute (white-label) page-title metadata for authenticated areas.
//
// Each tenant area layout uses `instituteTitleMetadata` so pages can set a bare
// segment title (e.g. "Teachers") and the browser tab reads
// "Teachers · {Institute Name}" — never the platform brand. Falls back to the
// platform name when there's no signed-in user / institute.

import "server-only";

import type { Metadata } from "next";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { APP_NAME } from "@/lib/constants";

/**
 * Title template metadata keyed to the signed-in user's institute name.
 * Used from an area layout's `generateMetadata`.
 */
export async function instituteTitleMetadata(): Promise<Metadata> {
  const user = await getCurrentUser();
  const institute = user
    ? await prisma.institute.findUnique({
        where: { id: user.instituteId },
        select: { name: true },
      })
    : null;

  const brand = institute?.name ?? APP_NAME;
  return {
    title: { template: `%s · ${brand}`, default: brand },
  };
}
