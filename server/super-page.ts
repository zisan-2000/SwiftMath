// Cached page loaders for the super-admin area.

import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";

import { requireSuperAdmin } from "@/lib/session";
import { getInstituteDetail } from "@/server/super";

/** Signed-in super admin. */
export const loadSuperPageContext = cache(async () => {
  const user = await requireSuperAdmin();
  return { user };
});

/** Super admin + scoped institute detail. Calls `notFound()` when missing. */
export const loadSuperInstitutePageContext = cache(async (instituteId: string) => {
  const { user } = await loadSuperPageContext();
  const detail = await getInstituteDetail(instituteId);
  if (!detail) notFound();
  return { user, ...detail, instituteId };
});
