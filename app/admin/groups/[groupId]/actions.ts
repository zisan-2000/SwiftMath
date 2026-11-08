"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { deleteAdminGroup, updateAdminGroup } from "@/server/admin";

/** Result of the edit-group form, surfaced via useActionState. */
export interface EditGroupState {
  error?: string;
  ok?: boolean;
  revision?: number;
}

/** Update a group in the admin's institute. */
export async function updateGroupAction(
  groupId: string,
  _prevState: EditGroupState,
  formData: FormData,
): Promise<EditGroupState> {
  const admin = await requireAdminPermission(PERMISSIONS.GROUP_MANAGE);

  const name = String(formData.get("name") ?? "").trim();
  const teacherIds = formData.getAll("teacherIds").map(String);


  const result = await updateAdminGroup(admin, groupId, { name, teacherIds, revision: Number(formData.get("revision")) });
  if (!result.ok) {
    return { error: result.error, revision: Number(formData.get("revision")) };
  }

  revalidatePath("/admin/groups", "layout");
  revalidatePath("/teacher", "layout");
  revalidatePath("/admin/teachers");
  revalidatePath(`/admin/groups/${groupId}`);
  return { ok: true, revision: result.revision };
}

/** Delete an empty group in the admin's institute. */
export async function deleteGroupAction(
  groupId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const admin = await requireAdminPermission(PERMISSIONS.GROUP_MANAGE);

  const result = await deleteAdminGroup(admin, groupId);
  if (!result.ok) {
    if (result.reason === "not-empty") {
      return {
        error:
          "This group has students or saved class, homework or exam records. It cannot be deleted.",
      };
    }
    return { error: "Group not found." };
  }

  revalidatePath("/admin/groups", "layout");
  revalidatePath("/teacher", "layout");
  revalidatePath("/admin/teachers");
  return { ok: true };
}
