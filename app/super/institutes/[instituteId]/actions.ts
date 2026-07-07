"use server";

import { revalidatePath } from "next/cache";

import type { ResetPasswordState } from "@/components/reset-password-form";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { resetInstituteAdminPassword } from "@/server/super";

/** Revalidate every Super Admin view that shows institute data. */
function revalidateInstituteViews(instituteId: string) {
  revalidatePath("/super/institutes");
  revalidatePath(`/super/institutes/${instituteId}`, "layout");
  revalidatePath("/super");
}

/**
 * Reset an institute ADMIN's password. The institute and user ids are bound by
 * the page; `resetInstituteAdminPassword` verifies the target is an ADMIN in
 * that tenant before delegating to the trusted password primitive.
 */
export async function resetInstituteAdminPasswordAction(
  instituteId: string,
  userId: string,
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  await requirePermission(PERMISSIONS.ADMIN_RESET_PASSWORD);

  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (next !== confirm) {
    return { error: "Passwords do not match." };
  }

  const ok = await resetInstituteAdminPassword(instituteId, userId, next);
  if (!ok) {
    return { error: "Admin not found in this institute." };
  }

  revalidateInstituteViews(instituteId);
  return { ok: true };
}
