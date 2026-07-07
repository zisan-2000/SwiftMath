"use server";

import { revalidatePath } from "next/cache";

import { PermissionEffect } from "@/lib/generated/prisma/enums";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { setStudentPermissionOverride } from "@/server/user-permissions";

export interface SetStudentPermissionState {
  error?: string;
  ok?: boolean;
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
