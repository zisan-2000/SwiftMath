"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { createAdminGroup } from "@/server/admin";

/** Result of the create-group form, surfaced via useActionState. */
export interface CreateGroupState {
  error?: string;
  ok?: boolean;
}

/** Create a group assigned to a teacher in the admin's institute. */
export async function createGroupAction(
  _prevState: CreateGroupState,
  formData: FormData,
): Promise<CreateGroupState> {
  const admin = await requireAdminPermission(PERMISSIONS.GROUP_MANAGE);

  const name = String(formData.get("name") ?? "").trim();
  const teacherId = String(formData.get("teacherId") ?? "");

  if (!teacherId) return { error: "Choose a teacher." };

  const result = await createAdminGroup(admin, { name, teacherId });
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/admin/groups");
  return { ok: true };
}
