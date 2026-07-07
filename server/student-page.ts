// Cached page loaders for the student area.

import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";

import { Role } from "@/lib/generated/prisma/enums";
import { requireRole } from "@/lib/session";
import {
  loadInstituteBranding,
  type InstituteBranding,
} from "@/server/institute-branding";

export type { InstituteBranding };

/** Signed-in student + institute branding. */
export const loadStudentPageContext = cache(async () => {
  const student = await requireRole(Role.STUDENT);
  const institute = await loadInstituteBranding(student.instituteId);
  return { student, institute };
});

/** Student + institute + practice session. Calls `notFound()` when missing. */
export const loadStudentPracticeSessionContext = cache(
  async (sessionId: string) => {
    const { student, institute } = await loadStudentPageContext();
    const { getStudentSession } = await import("@/server/practice");
    const session = await getStudentSession(student.id, sessionId);
    if (!session) notFound();
    return { student, institute, session, sessionId };
  },
);
