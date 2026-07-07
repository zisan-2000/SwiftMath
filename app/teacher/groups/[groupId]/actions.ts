"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import {
  addStudentToGroup,
  assignStudentLevel,
  deleteGroup,
  parseGroupTimeLimitField,
  resetStudentPassword,
  setGroupLevelTimeRule,
} from "@/server/teacher";
import {
  createScheduledExam,
  deleteScheduledExam,
  ScheduledExamError,
} from "@/server/scheduled-exam";
import { parseScheduleExamForm } from "@/lib/scheduled-exam-form";
import { setGroupQuestionEnabled } from "@/server/question-bank";
import type { ResetPasswordState } from "@/components/reset-password-form";

/** Result of the add-student form, surfaced via useActionState. */
export interface AddStudentState {
  error?: string;
  ok?: boolean;
}

/** Result of the schedule-exam form. */
export interface CreateScheduledExamState {
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
  const teacher = await requirePermission(PERMISSIONS.STUDENT_CREATE);

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

/** Schedule a timed exam window for every student in the group. */
export async function createScheduledExamAction(
  formData: FormData,
): Promise<CreateScheduledExamState> {
  const teacher = await requirePermission(PERMISSIONS.EXAM_SCHEDULE);

  const groupId = String(formData.get("groupId") ?? "");
  const parsed = parseScheduleExamForm({
    title: String(formData.get("title") ?? ""),
    levelId: String(formData.get("levelId") ?? ""),
    opensAtRaw: String(formData.get("opensAt") ?? ""),
    closesAtRaw: String(formData.get("closesAt") ?? ""),
  });

  if (!parsed.ok) {
    return { error: parsed.error };
  }

  try {
    await createScheduledExam(teacher, {
      groupId,
      levelId: parsed.data.levelId,
      title: parsed.data.title,
      opensAt: parsed.data.opensAt,
      closesAt: parsed.data.closesAt,
    });
  } catch (error) {
    if (error instanceof ScheduledExamError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/teacher/groups/${groupId}`);
  revalidatePath("/student");
  return { ok: true };
}

/** Cancel an upcoming exam with no student attempts (N5.3). */
export async function cancelScheduledExamAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const teacher = await requirePermission(PERMISSIONS.EXAM_CANCEL);

  const groupId = String(formData.get("groupId") ?? "");
  const scheduledExamId = String(formData.get("scheduledExamId") ?? "").trim();
  if (!scheduledExamId) {
    return { error: "Exam not found." };
  }

  try {
    await deleteScheduledExam(teacher, scheduledExamId);
  } catch (error) {
    if (error instanceof ScheduledExamError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/teacher/groups/${groupId}`);
  revalidatePath("/student");
  return { ok: true };
}

/** Plain form action wrapper (Next.js expects void). */
export async function cancelScheduledExamFormAction(
  formData: FormData,
): Promise<void> {
  const result = await cancelScheduledExamAction(formData);
  if (result.error) {
    throw new Error(result.error);
  }
}

/** Teacher enable/disable for one bank question in their group. */
export async function setGroupQuestionEnabledAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const teacher = await requirePermission(PERMISSIONS.GROUP_QUESTION_OVERRIDE);

  const groupId = String(formData.get("groupId") ?? "");
  const levelId = String(formData.get("levelId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const enabled = formData.get("enabled") === "true";

  const result = await setGroupQuestionEnabled(
    teacher,
    groupId,
    questionId,
    enabled,
  );
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(`/teacher/groups/${groupId}/questions?levelId=${levelId}`);
  revalidatePath(`/teacher/groups/${groupId}`);
  revalidatePath("/student");
  revalidatePath("/admin/activity");
  revalidatePath("/teacher/activity");
  return { ok: true };
}

/**
 * Set or clear a student's current level. Plain <form> action; an empty
 * levelId means "unassign".
 */
export async function assignLevelAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const teacher = await requirePermission(PERMISSIONS.STUDENT_ASSIGN_LEVEL);

  const groupId = String(formData.get("groupId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const levelIdRaw = String(formData.get("levelId") ?? "");
  const levelId = levelIdRaw === "" ? null : levelIdRaw;

  const result = await assignStudentLevel(teacher, studentId, levelId);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(`/teacher/groups/${groupId}`);
  return { ok: true };
}

/**
 * Reset a student's password. The student id is bound by the page;
 * `resetStudentPassword` re-checks the student is in one of this teacher's
 * groups.
 */
export async function resetStudentPasswordAction(
  studentId: string,
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const teacher = await requirePermission(PERMISSIONS.STUDENT_RESET_PASSWORD);

  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (next !== confirm) {
    return { error: "Passwords do not match." };
  }

  const ok = await resetStudentPassword(teacher, studentId, next);
  if (!ok) {
    return { error: "Student not found in your groups." };
  }

  return { ok: true };
}

/** Set or clear a per-group time override for a curriculum level. */
export async function setGroupLevelTimeAction(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const teacher = await requirePermission(PERMISSIONS.GROUP_MANAGE);

  const groupId = String(formData.get("groupId") ?? "");
  const levelId = String(formData.get("levelId") ?? "");
  const useDefault = formData.get("useDefault") === "true";
  const rawSeconds = String(formData.get("timeLimitSeconds") ?? "");

  let seconds: number | null;
  if (useDefault) {
    seconds = null;
  } else {
    const parsed = parseGroupTimeLimitField(rawSeconds);
    if (parsed == null && rawSeconds.trim()) {
      return { error: "Enter a valid number of seconds." };
    }
    seconds = parsed;
  }

  const result = await setGroupLevelTimeRule(teacher, groupId, levelId, seconds);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(`/teacher/groups/${groupId}`);
  return { ok: true };
}

/** Delete an empty group owned by the signed-in teacher. */
export async function deleteGroupAction(
  groupId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const teacher = await requirePermission(PERMISSIONS.GROUP_MANAGE);

  const result = await deleteGroup(teacher, groupId);
  if (!result.ok) {
    if (result.reason === "not-empty") {
      return {
        error:
          "This group still has students. Move them to another group first.",
      };
    }
    return { error: "Group not found." };
  }

  revalidatePath("/teacher/groups");
  return { ok: true };
}
