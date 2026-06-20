"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/session";
import { Role } from "@/lib/generated/prisma/enums";
import { addStudentToGroup, assignStudentLevel } from "@/server/teacher";

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

/** Create a student and add them to one of the teacher's groups. */
export async function addStudentAction(
  _prevState: AddStudentState,
  formData: FormData,
): Promise<AddStudentState> {
  const teacher = await requireRole(Role.TEACHER);

  const groupId = String(formData.get("groupId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Name is required." };
  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  try {
    await addStudentToGroup(teacher, groupId, { name, email, password });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "That email is already in use." };
    }
    throw error;
  }

  revalidatePath(`/teacher/groups/${groupId}`);
  return { ok: true };
}

/**
 * Set or clear a student's current level. Plain <form> action; an empty
 * levelId means "unassign".
 */
export async function assignLevelAction(formData: FormData) {
  const teacher = await requireRole(Role.TEACHER);

  const groupId = String(formData.get("groupId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const levelIdRaw = String(formData.get("levelId") ?? "");
  const levelId = levelIdRaw === "" ? null : levelIdRaw;

  await assignStudentLevel(teacher, studentId, levelId);

  revalidatePath(`/teacher/groups/${groupId}`);
}
