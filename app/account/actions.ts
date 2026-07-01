"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/session";
import { NotificationType } from "@/lib/generated/prisma/enums";
import {
  isConfigurableNotificationType,
  roleHasNotificationInbox,
} from "@/lib/notifications";
import { changeOwnPassword } from "@/server/users";
import { setUserNotificationPreference } from "@/server/notification-preferences";

/** Result of the change-password form, surfaced via useActionState. */
export interface ChangePasswordState {
  error?: string;
  ok?: boolean;
}

/** Toggle one notification type for the signed-in user (N7). */
export async function setNotificationPreferenceAction(
  type: NotificationType,
  enabled: boolean,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();

  if (!roleHasNotificationInbox(user.role)) {
    return { error: "Your role does not receive in-app notifications." };
  }

  if (!isConfigurableNotificationType(user.role, type)) {
    return { error: "That notification type is not available." };
  }

  const result = await setUserNotificationPreference({
    userId: user.id,
    instituteId: user.instituteId,
    role: user.role,
    type,
    enabled,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/account");
  return { ok: true };
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
