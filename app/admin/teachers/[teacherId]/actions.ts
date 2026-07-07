"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { updateAdminTeacher } from "@/server/admin";

/** Result of the edit-teacher form, surfaced via useActionState. */
export interface EditTeacherState {
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
