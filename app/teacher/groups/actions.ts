"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/session";
import { Role } from "@/lib/generated/prisma/enums";
import { createGroup } from "@/server/teacher";

/**
 * Create a group owned by the signed-in teacher, then open it.
 * Used by a plain <form>; the name input is `required` on the client and
 * re-checked here.
 */
export async function createGroupAction(formData: FormData) {
  const teacher = await requireRole(Role.TEACHER);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    // Nothing to do — bounce back to the list.
    redirect("/teacher/groups");
  }

  const group = await createGroup(teacher, name);

  revalidatePath("/teacher/groups");
  redirect(`/teacher/groups/${group.id}`);
}
