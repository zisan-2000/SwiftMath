"use server";

import { revalidatePath } from "next/cache";

import { PermissionEffect, Role } from "@/lib/generated/prisma/enums";
import { PERMISSIONS } from "@/lib/permissions";
import { requireAdminPermission, requirePermission } from "@/lib/session";
import { setStudentPermissionOverride } from "@/server/user-permissions";
import { assignStudentAcademicLevel } from "@/server/academic-levels";

export interface SetStudentPermissionState {
  error?: string;
  ok?: boolean;
}

export async function assignAdminAcademicLevelAction(studentId: string, formData: FormData) {
  const admin = await requireAdminPermission(PERMISSIONS.STUDENT_ASSIGN_ACADEMIC_LEVEL);
  await assignStudentAcademicLevel(
    { id: admin.id, instituteId: admin.instituteId, role: Role.ADMIN },
    studentId,
    String(formData.get("academicLevelId") ?? "") || null,
  );
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/activity");
}

export async function setStudentPermissionAction(
  studentId: string,
  _prevState: SetStudentPermissionState,
  formData: FormData,
): Promise<SetStudentPermissionState> {
  const admin = await requirePermission(PERMISSIONS.STUDENT_PERMISSIONS_MANAGE);

  const permission = String(formData.get("permission") ?? "");
  const effectValue = String(formData.get("effect") ?? "DEFAULT");
  const effect =
    effectValue === "DEFAULT"
      ? null
      : effectValue === PermissionEffect.ALLOW ||
          effectValue === PermissionEffect.DENY
        ? effectValue
        : undefined;

  if (effect === undefined) {
    return { error: "Choose a valid permission override." };
  }

  const result = await setStudentPermissionOverride(
    admin,
    studentId,
    permission,
    effect,
  );
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/admin/activity");
  revalidatePath(`/admin/students/${studentId}`);
  return { ok: true };
}
