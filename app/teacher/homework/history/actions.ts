"use server";

import { revalidatePath } from "next/cache";

import type { HomeworkReviewState } from "@/components/homework/homework-review-form";
import { HomeworkSubmissionStatus } from "@/lib/generated/prisma/enums";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { HomeworkError, reviewHomeworkSubmission } from "@/server/homework";

export async function reviewHomeworkFromHistoryAction(
  _previousState: HomeworkReviewState,
  formData: FormData,
): Promise<HomeworkReviewState> {
  const teacher = await requirePermission(PERMISSIONS.HOMEWORK_MANAGE);
  const rawStatus = String(formData.get("status") ?? "");
  if (!Object.values(HomeworkSubmissionStatus).includes(rawStatus as HomeworkSubmissionStatus)) {
    return { error: "Choose Approve, Reject, or Request resubmission." };
  }
  const status = rawStatus as HomeworkSubmissionStatus;
  const scoreText = String(formData.get("score") ?? "").trim();

  try {
    await reviewHomeworkSubmission(teacher, {
      submissionId: String(formData.get("submissionId") ?? ""),
      status,
      score: scoreText ? Number(scoreText) : null,
      comment: String(formData.get("comment") ?? ""),
    });
  } catch (error) {
    if (error instanceof HomeworkError) return { error: error.message };
    throw error;
  }

  revalidatePath("/teacher/homework/history");
  revalidatePath("/student/homework");
  return { ok: true, message: "Review saved successfully." };
}
