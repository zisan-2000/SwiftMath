// Cached page loaders for the teacher area — dedupe auth + branding fetches
// within a single request (React cache).

import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";

import { Role } from "@/lib/generated/prisma/enums";
import { requireRole } from "@/lib/session";
import {
  loadInstituteBranding,
  type InstituteBranding,
} from "@/server/institute-branding";
import { getTeacherGroup } from "@/server/teacher";

export type { InstituteBranding };

/** Signed-in teacher + institute branding (dashboard, students, exams, …). */
export const loadTeacherPageContext = cache(async () => {
  const teacher = await requireRole(Role.TEACHER);
  const institute = await loadInstituteBranding(teacher.instituteId);
  return { teacher, institute };
});

/** Teacher + institute + owned group. Calls `notFound()` when unauthorized. */
export const loadTeacherGroupPageContext = cache(async (groupId: string) => {
  const { teacher, institute } = await loadTeacherPageContext();
  const group = await getTeacherGroup(teacher, groupId);
  if (!group) notFound();
  return { teacher, institute, group, groupId };
});
