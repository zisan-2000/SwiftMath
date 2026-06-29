"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/session";
import { Role } from "@/lib/generated/prisma/enums";
import { deleteAdminGroup, updateAdminGroup } from "@/server/admin";

/** Result of the edit-group form, surfaced via useActionState. */
export interface EditGroupState {
  error?: string;
  ok?: boolean;
}

/** Update a group in the admin's institute. */
export async function updateGroupAction(
  groupId: string,
  _prevState: EditGroupState,
  formData: FormData,
): Promise<EditGroupState> {
  const admin = await requireRole(Role.ADMIN);

  const name = String(formData.get("name") ?? "").trim();
  const teacherId = String(formData.get("teacherId") ?? "");

  if (!teacherId) return { error: "Choose a teacher." };

  const result = await updateAdminGroup(admin, groupId, { name, teacherId });
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/admin/groups");
  revalidatePath(`/admin/groups/${groupId}`);
  return { ok: true };
}

/** Delete an empty group in the admin's institute. */
export async function deleteGroupAction(
  groupId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const admin = await requireRole(Role.ADMIN);

  const result = await deleteAdminGroup(admin, groupId);
  if (!result.ok) {
    if (result.reason === "not-empty") {
      return {
        error:
          "This group still has students. Move them to another group first.",
      };
    }
    return { error: "Group not found." };
  }

  revalidatePath("/admin/groups");
  return { ok: true };
}
