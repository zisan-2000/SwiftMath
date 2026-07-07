"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { createStudentInGroup } from "@/server/admin";

/** Result of the add-student form, surfaced via useActionState. */
export interface AddStudentState {
  error?: string;
  ok?: boolean;
}

/** Looks like a Prisma unique-constraint violation (duplicate email)? */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/** Create a STUDENT in a group belonging to the signed-in admin's institute. */
export async function addStudentAction(
  _prevState: AddStudentState,
  formData: FormData,
): Promise<AddStudentState> {
  const admin = await requirePermission(PERMISSIONS.STUDENT_CREATE);

  const groupId = String(formData.get("groupId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const levelIdRaw = String(formData.get("levelId") ?? "");
  const levelId = levelIdRaw === "" ? null : levelIdRaw;

  if (!groupId) return { error: "Choose a group." };
  if (!name) return { error: "Name is required." };
  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  try {
    const result = await createStudentInGroup(
      admin,
      groupId,
      { name, email, password },
      levelId,
    );
    if (!result.ok) {
      return { error: result.error };
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "That email is already in use." };
    }
    throw error;
  }

  revalidatePath("/admin/students");
  return { ok: true };
}
