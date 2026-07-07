"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { createTeacher } from "@/server/admin";

/** Result of the add-teacher form, surfaced via useActionState. */
export interface AddTeacherState {
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

/** Create a TEACHER in the signed-in admin's institute. */
export async function addTeacherAction(
  _prevState: AddTeacherState,
  formData: FormData,
): Promise<AddTeacherState> {
  const admin = await requirePermission(PERMISSIONS.TEACHER_CREATE);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Name is required." };
  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  try {
    await createTeacher(admin, { name, email, password });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "That email is already in use." };
    }
    throw error;
  }

  revalidatePath("/admin/teachers");
  return { ok: true };
}
