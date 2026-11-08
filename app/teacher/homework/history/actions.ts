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
  let expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "");
  const rawStatus = String(formData.get("status") ?? "");
  if (!Object.values(HomeworkSubmissionStatus).includes(rawStatus as HomeworkSubmissionStatus)) {
    return { error: "Choose Approve, Reject, or Request resubmission.", expectedUpdatedAt };
  }
  const status = rawStatus as HomeworkSubmissionStatus;
  const scoreText = String(formData.get("score") ?? "").trim();

  try {
    const saved = await reviewHomeworkSubmission(teacher, {
      submissionId: String(formData.get("submissionId") ?? ""),
      status,
      expectedUpdatedAt,
      score: scoreText ? Number(scoreText) : null,
      comment: String(formData.get("comment") ?? ""),
    });
    expectedUpdatedAt = saved.updatedAt.toISOString();
  } catch (error) {
    if (error instanceof HomeworkError) return { error: error.message, expectedUpdatedAt };
    throw error;
  }

  revalidatePath("/teacher/homework/history");
  revalidatePath("/student/homework");
  return { ok: true, message: "Review saved successfully.", expectedUpdatedAt };
}
