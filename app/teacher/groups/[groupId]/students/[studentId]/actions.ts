"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { moveStudentToGroup } from "@/server/teacher";
import { Role } from "@/lib/generated/prisma/enums";
import { AcademicLevelError, assignStudentAcademicLevel } from "@/server/academic-levels";

/**
 * Move a student into another of the teacher's groups, then open the student in
 * their new group. Invalid/no-op moves just bounce back. `moveStudentToGroup`
 * re-checks ownership of both the source and target groups.
 */
export async function moveStudentAction(formData: FormData) {
  const teacher = await requirePermission(PERMISSIONS.STUDENT_ASSIGN_GROUP);

  const studentId = String(formData.get("studentId") ?? "");
  const currentGroupId = String(formData.get("currentGroupId") ?? "");
  const targetGroupId = String(formData.get("targetGroupId") ?? "");

  const backToCurrent = `/teacher/groups/${currentGroupId}/students/${studentId}`;

  if (!targetGroupId || targetGroupId === currentGroupId) {
    redirect(backToCurrent);
  }

  const ok = await moveStudentToGroup(teacher, studentId, targetGroupId);
  if (!ok) {
    redirect(backToCurrent);
  }

  // Refresh both groups' detail pages so their rosters reflect the move.
  revalidatePath(`/teacher/groups/${currentGroupId}`);
  revalidatePath(`/teacher/groups/${targetGroupId}`);
  redirect(`/teacher/groups/${targetGroupId}/students/${studentId}`);
}

export async function assignAcademicLevelAction(formData: FormData) {
  const teacher = await requirePermission(PERMISSIONS.STUDENT_ASSIGN_ACADEMIC_LEVEL);
  const groupId = String(formData.get("groupId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const levelId = String(formData.get("academicLevelId") ?? "") || null;
  try {
    await assignStudentAcademicLevel(
      { id: teacher.id, instituteId: teacher.instituteId, role: Role.TEACHER },
      studentId,
      levelId,
    );
  } catch (error) {
    const message = error instanceof AcademicLevelError ? error.message : "Could not update Academic Level.";
    redirect(`/teacher/groups/${groupId}/students/${studentId}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/teacher/groups/${groupId}/students/${studentId}`);
  revalidatePath(`/teacher/groups/${groupId}/students`);
  redirect(`/teacher/groups/${groupId}/students/${studentId}?success=${encodeURIComponent("Academic Level updated.")}`);
}
