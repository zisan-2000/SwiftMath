// Cached page loaders for the teacher area — dedupe auth + branding fetches
// within a single request (React cache).

import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { requireRole } from "@/lib/session";
import { getTeacherGroup } from "@/server/teacher";

export interface InstituteBranding {
  name: string;
  logoUrl: string | null;
}

/** White-label institute row for authenticated teacher pages. */
export const loadInstituteBranding = cache(
  async (instituteId: string): Promise<InstituteBranding | null> => {
    return prisma.institute.findUnique({
      where: { id: instituteId },
      select: { name: true, logoUrl: true },
    });
  },
);

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
