"use server";

import { requireUser } from "@/lib/session";
import { changeOwnPassword } from "@/server/users";

/** Result of the change-password form, surfaced via useActionState. */
export interface ChangePasswordState {
  error?: string;
  ok?: boolean;
}

/** Change the signed-in user's own password, verifying the current one first. */
export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireUser();

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (next !== confirm) {
    return { error: "New passwords do not match." };
  }
  if (next === current) {
    return { error: "New password must be different from the current one." };
  }

  const result = await changeOwnPassword(user.id, current, next);
  if (result === "wrong-current") {
    return { error: "Your current password is incorrect." };
  }
  if (result === "no-credential") {
    return { error: "No password is set on this account." };
  }

  return { ok: true };
}
