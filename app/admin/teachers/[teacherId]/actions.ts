"use server";

import { revalidatePath } from "next/cache";

import { PermissionEffect } from "@/lib/generated/prisma/enums";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { updateAdminTeacher } from "@/server/admin";
import { setTeacherPermissionOverride } from "@/server/user-permissions";

/** Result of the edit-teacher form, surfaced via useActionState. */
export interface EditTeacherState {
  error?: string;
  ok?: boolean;
}

export interface SetTeacherPermissionState {
  error?: string;
  ok?: boolean;
}

/** Update a teacher's profile in the admin's institute. */
export async function updateTeacherAction(
  teacherId: string,
  _prevState: EditTeacherState,
  formData: FormData,
): Promise<EditTeacherState> {
  const admin = await requirePermission(PERMISSIONS.TEACHER_CREATE);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  const result = await updateAdminTeacher(admin, teacherId, { name, email });
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/admin/teachers");
  revalidatePath(`/admin/teachers/${teacherId}`);
  return { ok: true };
}

export async function setTeacherPermissionAction(
  teacherId: string,
  _prevState: SetTeacherPermissionState,
  formData: FormData,
): Promise<SetTeacherPermissionState> {
  const admin = await requirePermission(PERMISSIONS.TEACHER_PERMISSIONS_MANAGE);

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

  const result = await setTeacherPermissionOverride(
    admin,
    teacherId,
    permission,
    effect,
  );

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/admin/activity");
  revalidatePath(`/admin/teachers/${teacherId}`);
  return { ok: true };
}
