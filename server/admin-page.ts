// Cached page loaders for the admin area.

import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";

import { Role } from "@/lib/generated/prisma/enums";
import { requireRole } from "@/lib/session";
import { loadInstituteBranding } from "@/server/institute-branding";
import { getLevel } from "@/server/admin";

/** Signed-in admin + institute branding. */
export const loadAdminPageContext = cache(async () => {
  const admin = await requireRole(Role.ADMIN);
  const institute = await loadInstituteBranding(admin.instituteId);
  return { admin, institute };
});

/** Admin + institute + scoped level. Calls `notFound()` when missing. */
export const loadAdminLevelPageContext = cache(async (levelId: string) => {
  const { admin, institute } = await loadAdminPageContext();
  const level = await getLevel(admin, levelId);
  if (!level) notFound();
  return { admin, institute, level, levelId };
});
