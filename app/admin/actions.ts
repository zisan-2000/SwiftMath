"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { resetUserPassword, setUserActive } from "@/server/admin";
import type { ResetPasswordState } from "@/components/reset-password-form";

/**
 * Reset a teacher's or student's password. The target id is bound by the page;
 * `resetUserPassword` re-checks that the user belongs to the admin's institute.
 */
export async function resetUserPasswordAction(
  userId: string,
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const admin = await requireAdminPermission(PERMISSIONS.STUDENT_RESET_PASSWORD);

  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (next !== confirm) {
    return { error: "Passwords do not match." };
  }

  const ok = await resetUserPassword(admin, userId, next);
  if (!ok) {
    return { error: "User not found in your institute." };
  }

  return { ok: true };
}

/**
 * Enable or disable a teacher/student. The id and target state are bound by the
 * page; `setUserActive` re-checks institute membership and blocks self/admin
 * targets.
 */
export async function setUserActiveAction(
  userId: string,
  isActive: boolean,
  _formData: FormData,
) {
  void _formData;
  const admin = await requireAdminPermission(PERMISSIONS.STUDENT_DISABLE);

  await setUserActive(admin, userId, isActive);

  revalidatePath("/admin/teachers");
  revalidatePath("/admin/students");
}
