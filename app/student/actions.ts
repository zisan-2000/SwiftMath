"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { LevelAccessError } from "@/server/level-access";
import {
  ScheduledExamError,
  startExamSession,
} from "@/server/scheduled-exam";

/** Start (or resume) a scheduled exam from the student dashboard. */
export async function startExamAction(formData: FormData) {
  const student = await requirePermission(PERMISSIONS.STUDENT_EXAM_START);
  const scheduledExamId = String(formData.get("scheduledExamId") ?? "").trim();

  if (!scheduledExamId) {
    redirect("/student");
  }

  try {
    const sessionId = await startExamSession(student, scheduledExamId);
    revalidatePath("/student");
    revalidatePath("/student/practice");
    redirect(`/student/practice/${sessionId}`);
  } catch (error) {
    if (error instanceof ScheduledExamError) {
      redirect(
        `/student?examError=${encodeURIComponent(error.message)}`,
      );
    }
    if (error instanceof LevelAccessError) {
      redirect("/student?examError=locked");
    }
    redirect("/student");
  }
}
